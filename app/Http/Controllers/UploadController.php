<?php

namespace App\Http\Controllers;

use App\Support\MediaStorage;

class UploadController extends Controller
{
    /**
     * Resolve an uploaded file to wherever it is actually stored.
     *
     * @param  string  $path
     * @return \Illuminate\Http\Response|\Illuminate\Http\RedirectResponse
     */
    public function show($path)
    {
        // Reject traversal before the path is used to build a URL or a filename.
        if (str_contains($path, '..') || str_starts_with($path, '/')) {
            abort(404);
        }

        if (MediaStorage::usesSupabase()) {
            return redirect()->away(MediaStorage::publicUrl($path));
        }

        $file = MediaStorage::get($path);

        if ($file === null) {
            abort(404);
        }

        return response($file['contents'], 200, [
            'Content-Type' => $file['mime_type'],
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }
}
