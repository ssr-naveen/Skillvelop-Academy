<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * A deployment smoke test.
 *
 * Reaching this endpoint at all proves the PHP function booted and the
 * application key is set. The payload then reports whether the database is
 * reachable, without disclosing the host or the credentials used.
 */
class HealthController extends Controller
{
    /**
     * @return \Illuminate\Http\JsonResponse
     */
    public function __invoke()
    {
        $checks = [
            'app' => 'ok',
            'database' => 'unknown',
            'admin_account' => 'unknown',
        ];

        try {
            DB::connection()->getPdo();
            $checks['database'] = 'connected';

            $checks['admin_account'] = DB::table('users')->where('user_type', 0)->exists()
                ? 'present'
                : 'missing';
        } catch (Throwable $e) {
            $checks['database'] = 'error';

            // The SQLSTATE alone says what went wrong (08006 unreachable,
            // 28P01 bad password, 3D000 wrong database) without echoing the
            // connection details back to whoever loaded the page.
            // PDO reports the SQLSTATE in errorInfo; getCode() carries the
            // driver's own number, which is the only thing available when the
            // connection never got far enough to have a SQLSTATE.
            $state = $e instanceof \PDOException && isset($e->errorInfo[0]) ? (string) $e->errorInfo[0] : '';

            $checks['database_code'] = preg_match('/^[0-9A-Z]{5}$/', $state)
                ? $state
                : 'driver-'.$e->getCode();
        }

        $healthy = $checks['database'] === 'connected' && $checks['admin_account'] === 'present';

        return response()->json($checks, $healthy ? 200 : 503);
    }
}
