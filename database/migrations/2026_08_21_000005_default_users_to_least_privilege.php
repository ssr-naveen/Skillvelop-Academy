<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * user_type defaulted to 0, which this application reads as "administrator".
 * Any insert that forgot to set it therefore created a super administrator.
 * Default to the least privileged type instead, so a missing value can never
 * grant access on its own.
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        DB::statement('alter table users alter column user_type set default 3');
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        DB::statement('alter table users alter column user_type set default 0');
    }
};
