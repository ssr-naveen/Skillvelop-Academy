<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('action_masters', function (Blueprint $table) {
            $table->id();
            $table->bigInteger('parent_id')->default(0)->nullable();
            $table->string('action', 200)->nullable();
            $table->string('action_title', 255)->nullable();
            $table->string('show_in_menu', 200)->nullable();
            $table->string('show_in_permission', 200)->nullable();
            $table->string('display_order', 200)->nullable();
            $table->string('icon', 200)->nullable();
            $table->tinyInteger('status')->default(0)->nullable()->comment('0 => Inactive, 1 => Active, 2 => Deleted');
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();
        });

        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name', 200)->nullable();
            $table->tinyInteger('status')->default(1);
            $table->timestamps();
            $table->timestamp('deleted_at')->nullable();
        });

        Schema::create('role_permissions', function (Blueprint $table) {
            $table->id();
            $table->integer('role_id')->nullable()->index();
            $table->string('permission_id', 255)->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('role_permissions');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('action_masters');
    }
};
