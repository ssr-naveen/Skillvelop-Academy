<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Creates the platform's super administrator and a Sub Admin role that is
 * pre-granted every permission in the action master.
 */
class SuperAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $now = now();

        DB::table('roles')->updateOrInsert(
            ['name' => 'Sub Admin'],
            ['status' => 1, 'created_at' => $now, 'updated_at' => $now]
        );

        $roleId = DB::table('roles')->where('name', 'Sub Admin')->value('id');

        DB::table('role_permissions')->updateOrInsert(
            ['role_id' => $roleId],
            [
                'permission_id' => DB::table('action_masters')->pluck('id')->implode(','),
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        $username = env('SUPER_ADMIN_USERNAME', 'skillvelop-admin');
        $email = env('SUPER_ADMIN_EMAIL', 'admin@skillvelop.com');
        $password = env('SUPER_ADMIN_PASSWORD');

        $admin = User::where('username', $username)->orWhere('email', $email)->first() ?: new User;

        $admin->forceFill([
            'first_name' => 'Skillvelop',
            'last_name' => 'Admin',
            'name' => 'Skillvelop Admin',
            'username' => $username,
            'email' => $email,
            'user_type' => 0,
            'status' => 1,
        ]);

        // Only (re)set the password when one was supplied, so re-running the
        // seeder never silently resets a password chosen later.
        if ($password || ! $admin->exists) {
            $admin->password = Hash::make($password ?: 'password');
        }

        $admin->save();
    }
}
