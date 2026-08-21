<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use PDO;
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
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function __invoke(Request $request)
    {
        if ($request->boolean('probe')) {
            return response()->json(['probe' => $this->probe()]);
        }

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

    /**
     * Try every plausible pooler endpoint and report how each one answers.
     *
     * Supabase does not publish which pooler cluster a project sits on through
     * any API reachable from here, and a cluster that does not host the project
     * still completes the TCP connection before rejecting the tenant, so libpq
     * never fails over to the next host on its own.
     *
     * @return array<int, array<string, string|int>>
     */
    protected function probe()
    {
        $region = 'ap-south-1';
        $results = [];

        foreach (['aws-0', 'aws-1'] as $cluster) {
            foreach ([6543, 5432] as $port) {
                $host = $cluster.'-'.$region.'.pooler.supabase.com';
                $results[] = $this->attempt($host, $port) + ['host' => $host, 'port' => $port];
            }
        }

        return $results;
    }

    /**
     * Open one connection and describe the outcome.
     *
     * @param  string  $host
     * @param  int  $port
     * @return array<string, string>
     */
    protected function attempt($host, $port)
    {
        $password = (string) config('database.connections.pgsql.password');

        try {
            new PDO(
                sprintf('pgsql:host=%s;port=%d;dbname=%s;sslmode=require;connect_timeout=2', $host, $port, config('database.connections.pgsql.database')),
                config('database.connections.pgsql.username'),
                $password,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_TIMEOUT => 2]
            );

            return ['result' => 'connected'];
        } catch (Throwable $e) {
            $message = preg_replace('/\s+/', ' ', $e->getMessage());

            // The password is never echoed in a libpq error, but redact it
            // anyway rather than rely on that.
            if ($password !== '') {
                $message = str_replace($password, '[redacted]', $message);
            }

            return ['result' => 'error', 'detail' => mb_substr($message, 0, 160)];
        }
    }
}
