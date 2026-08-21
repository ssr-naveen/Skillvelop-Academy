<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Media Driver
    |--------------------------------------------------------------------------
    |
    | "local"    writes admin uploads into public/uploads.
    | "database"  keeps them in the media_files table.
    | "supabase"  pushes them to a Supabase Storage bucket.
    |
    | Production runs on a read-only filesystem, so it must not use "local".
    |
    */

    'driver' => env('MEDIA_DRIVER', 'local'),

    'supabase' => [
        'url' => env('SUPABASE_URL'),
        'key' => env('SUPABASE_SERVICE_KEY'),
        'bucket' => env('SUPABASE_BUCKET', 'uploads'),
    ],

];
