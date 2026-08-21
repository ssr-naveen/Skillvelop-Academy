<?php

/*
|--------------------------------------------------------------------------
| Serverless Entry Point
|--------------------------------------------------------------------------
|
| Vercel invokes this file for every request that is not a static asset. The
| real work is done by Laravel's normal front controller; bootstrap/app.php
| takes care of moving the framework's writable paths to /tmp.
|
*/

require __DIR__.'/../public/index.php';
