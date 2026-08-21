<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * The permission catalogue the role screens build their checkbox tree from.
 * Every admin route that can be granted to a sub-admin needs a row here.
 */
class ActionMasterSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $groups = [
            ['/user', 'Manage User'],
            ['/role', 'Manage Role'],
            ['/category', 'Category Management'],
            ['/manage-page', 'Page Management'],
            ['/cms', 'CMS Management'],
            ['/products', 'Product Management'],
            ['/faq', 'FAQ Management'],
            ['/coupons', 'Coupon Management'],
            ['/customer', 'Customer Management'],
        ];

        foreach ($groups as $order => [$action, $title]) {
            $parentId = $this->upsert($action, 0, $title, (string) (count($groups) - $order));

            $this->upsert($action.'/create', $parentId, $title.' Create');
            $this->upsert($action.'/edit', $parentId, $title.' Edit');

            if ($action === '/role') {
                $this->upsert('/role-permission', $parentId, 'Manage Role Permission');
            }
        }
    }

    /**
     * Insert or refresh a single permission row and return its id.
     *
     * @param  string  $action
     * @param  int  $parentId
     * @param  string  $title
     * @param  string|null  $displayOrder
     * @return int
     */
    protected function upsert($action, $parentId, $title, $displayOrder = null)
    {
        $now = now();

        DB::table('action_masters')->updateOrInsert(
            ['action' => $action, 'parent_id' => $parentId],
            [
                'action_title' => $title,
                'display_order' => $displayOrder,
                'status' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );

        return DB::table('action_masters')
            ->where('action', $action)
            ->where('parent_id', $parentId)
            ->value('id');
    }
}
