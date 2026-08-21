<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Stores admin uploads.
 *
 * The "local" driver writes into public/uploads exactly as the application
 * always did. Production runs on a read-only filesystem, so it uses "database"
 * (bytes in the media_files table) or "supabase" (a Storage bucket) instead.
 * Either way the files are read back through the /uploads/{path} route.
 */
class MediaStorage
{
    /**
     * The configured driver.
     *
     * @return string
     */
    public static function driver()
    {
        $driver = config('media.driver', 'local');

        // Fall back to the local disk rather than silently dropping uploads if
        // Supabase Storage is selected without credentials.
        if ($driver === 'supabase' && ! (config('media.supabase.url') && config('media.supabase.key'))) {
            return 'local';
        }

        return $driver;
    }

    /**
     * Whether reads should be redirected to Supabase Storage.
     *
     * @return bool
     */
    public static function usesSupabase()
    {
        return static::driver() === 'supabase';
    }

    /**
     * Store an uploaded file as uploads/{folder}/{name}.
     *
     * @param  string  $folder
     * @param  \Illuminate\Http\UploadedFile  $file
     * @param  string  $name
     * @return bool
     */
    public static function put($folder, UploadedFile $file, $name)
    {
        $path = trim($folder, '/').'/'.$name;
        $mime = $file->getMimeType() ?: 'application/octet-stream';

        switch (static::driver()) {
            case 'database':
                return static::putInDatabase($path, $file, $mime);

            case 'supabase':
                return static::putInSupabase($path, $file, $mime);

            default:
                return static::putOnDisk($folder, $file, $name);
        }
    }

    /**
     * Read a stored file back.
     *
     * @param  string  $path
     * @return array|null  ['contents' => string, 'mime_type' => string]
     */
    public static function get($path)
    {
        if (static::driver() === 'database') {
            $row = DB::table('media_files')->where('path', $path)->first();

            if ($row === null) {
                return null;
            }

            return [
                'contents' => static::decode($row->contents),
                'mime_type' => $row->mime_type ?: 'application/octet-stream',
            ];
        }

        $local = public_path('uploads/'.$path);

        if (! File::exists($local)) {
            return null;
        }

        return [
            'contents' => File::get($local),
            'mime_type' => File::mimeType($local) ?: 'application/octet-stream',
        ];
    }

    /**
     * Remove a stored file.
     *
     * @param  string  $folder
     * @param  string  $name
     * @return void
     */
    public static function delete($folder, $name)
    {
        if (! $name) {
            return;
        }

        $path = trim($folder, '/').'/'.$name;

        switch (static::driver()) {
            case 'database':
                DB::table('media_files')->where('path', $path)->delete();
                break;

            case 'supabase':
                Http::withToken(config('media.supabase.key'))->delete(static::objectUrl($path));
                break;

            default:
                $local = public_path('uploads/'.$path);

                if (File::exists($local)) {
                    File::delete($local);
                }
        }
    }

    /**
     * The public URL a Supabase-hosted file can be read from.
     *
     * @param  string  $path
     * @return string
     */
    public static function publicUrl($path)
    {
        return rtrim(config('media.supabase.url'), '/')
            .'/storage/v1/object/public/'
            .config('media.supabase.bucket').'/'
            .ltrim($path, '/');
    }

    /**
     * Write the upload into public/uploads.
     *
     * @param  string  $folder
     * @param  \Illuminate\Http\UploadedFile  $file
     * @param  string  $name
     * @return bool
     */
    protected static function putOnDisk($folder, UploadedFile $file, $name)
    {
        $destination = public_path('/uploads/'.trim($folder, '/').'/');

        if (! File::exists($destination)) {
            File::makeDirectory($destination, 0777, true, true);
        }

        $file->move($destination, $name);

        return true;
    }

    /**
     * Write the upload into the media_files table.
     *
     * @param  string  $path
     * @param  \Illuminate\Http\UploadedFile  $file
     * @param  string  $mime
     * @return bool
     */
    protected static function putInDatabase($path, UploadedFile $file, $mime)
    {
        $contents = file_get_contents($file->getRealPath());

        DB::table('media_files')->updateOrInsert(
            ['path' => $path],
            [
                'mime_type' => $mime,
                'size' => strlen($contents),
                'contents' => base64_encode($contents),
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        return true;
    }

    /**
     * Push the upload to the Supabase Storage bucket.
     *
     * @param  string  $path
     * @param  \Illuminate\Http\UploadedFile  $file
     * @param  string  $mime
     * @return bool
     */
    protected static function putInSupabase($path, UploadedFile $file, $mime)
    {
        $response = Http::withToken(config('media.supabase.key'))
            ->withHeaders(['x-upsert' => 'true'])
            ->withBody(file_get_contents($file->getRealPath()), $mime)
            ->post(static::objectUrl($path));

        if ($response->failed()) {
            Log::error('Supabase Storage upload failed', [
                'path' => $path,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return false;
        }

        return true;
    }

    /**
     * The authenticated Storage API URL used for writes and deletes.
     *
     * @param  string  $path
     * @return string
     */
    protected static function objectUrl($path)
    {
        return rtrim(config('media.supabase.url'), '/')
            .'/storage/v1/object/'
            .config('media.supabase.bucket').'/'
            .ltrim($path, '/');
    }

    /**
     * Turn a stored blob back into raw bytes.
     *
     * Contents are held base64 encoded so the value survives both Postgres
     * bytea and MySQL blob columns without driver-specific handling.
     *
     * @param  mixed  $contents
     * @return string
     */
    protected static function decode($contents)
    {
        if (is_resource($contents)) {
            $contents = stream_get_contents($contents);
        }

        // Postgres hands bytea back in hex form when it is not read as a stream.
        if (is_string($contents) && str_starts_with($contents, '\x')) {
            $contents = hex2bin(substr($contents, 2));
        }

        return base64_decode($contents, true) ?: $contents;
    }
}
