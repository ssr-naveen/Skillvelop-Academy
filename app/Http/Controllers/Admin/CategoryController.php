<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\MediaStorage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Yajra\DataTables\DataTables;
use App\Helpers\Helper;

class CategoryController extends Controller
{
    //
    public function index(Request $request)
    {
        if ($request->ajax()) {
            $categories = DB::table('categories')->where('status', '<>', 2)->orderBy('id','DESC')->get();
            // dd(1);
            $datatables = Datatables::of($categories)
                ->editColumn('name', function ($row) {
                    if ($row->parent != 0) {

                        $category = Helper::parentCategoryData($row->parent);

                        return '<span class="badge badge-soft-danger my-1 me-2">' . $category->name . '</span>
                            <span class="badge badge-soft-success my-1 me-2">></span>
                            <span class="badge badge-soft-success my-1 me-2">' . $row->name . '</span>';
                    } else {
                        return '<span class="badge badge-soft-success my-1 me-2">' . $row->name . '</span>';
                    }
                })
                ->editColumn('check', function ($row) {
                    return '<span class="form-check mb-0"><input type="checkbox" class="form-check-input check-select" id="chk_sel_"><label class="form-check-label" for="chk_sel_"></label></span>';
                })
                ->editColumn('created_at', function ($row) {
                    return date('d M, Y', strtotime($row->created_at));
                })
                ->addColumn('action', function ($row) {
                    $action_1 = '';
                    if ($row->status == 0) {
                        $action_1 = '<a class="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover statusBtn"
                                        data-bs-toggle="tooltip" data-placement="top" title=""
                                        data-bs-original-title="Inactive" href="#" data-dc="' . base64_encode($row->id) . '" data-id="' . base64_encode($row->id) . '" data-type="' . base64_encode('enable') . '">
                                        <span class="icon">
                                        <i class="fas fa-circle-dot" style="color:red;"></i>
                                        </span>
                                    </a>
                                    <a class="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover statusBtn d-none"
                                        data-bs-toggle="tooltip" data-placement="top" title=""
                                        data-bs-original-title="Active" href="#" data-ac="' . base64_encode($row->id) . '" data-id="' . base64_encode($row->id) . '" data-type="' . base64_encode('disable') . '">
                                        <span class="icon">
                                        <i class="fas fa-circle-dot" style="color:green;"></i>
                                        </span>
                                    </a>';
                    } else {
                        $action_1 = '<a class="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover statusBtn d-none"
                                        data-bs-toggle="tooltip" data-placement="top" title=""
                                        data-bs-original-title="Inactive" href="#" data-dc="' . base64_encode($row->id) . '" data-id="' . base64_encode($row->id) . '" data-type="' . base64_encode('enable') . '">
                                        <span class="icon">
                                        <i class="fas fa-circle-dot" style="color:red;"></i>
                                        </span>
                                    </a>
                                    <a class="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover statusBtn"
                                        data-bs-toggle="tooltip" data-placement="top" title=""
                                        data-bs-original-title="Active" href="#" data-ac="' . base64_encode($row->id) . '" data-id="' . base64_encode($row->id) . '" data-type="' . base64_encode('disable') . '">
                                        <span class="icon">
                                        <i class="fas fa-circle-dot" style="color:green;"></i>
                                        </span>
                                    </a>';
                    }

                    $edit_url = url('/admin/category/edit', ['id' => base64_encode($row->id)]);

                    $action_2 = '<a class="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover"
                                data-bs-toggle="tooltip" data-placement="top" title=""
                                data-bs-original-title="Edit" href="' . $edit_url . '">
                                <span class="icon">
                                    <span class="feather-icon">
                                    <i class="fas fa-edit text-info"></i>
                                    </span>
                                </span>
                            </a>';

                    $action_3 = '<a class="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover deleteBtn"
                                data-bs-toggle="tooltip" data-placement="top" title=""
                                data-bs-original-title="Delete" href="javascript:void(0)" data-id="' . base64_encode($row->id) . '">
                                <span class="icon">
                                    <span class="feather-icon">
                                    <i class="fas fa-trash text-danger"></i>
                                    </span>
                                </span>
                            </a>';
                    $action = '<div class="d-flex align-items-center">
                                <div class="d-flex">
                                    ' . $action_1 . '
                                    ' . $action_2 . '
                                    ' . $action_3 . '
                                </div>
                            </div>';
                    return $action;
                });

            $datatables = $datatables->rawColumns(['name', 'check', 'action'])->make(true);

            return $datatables;
        }

        return view('admin.category.index');
    }

    public function create(Request $request)
    {
        if ($request->isMethod('get')) {
            $parent_categories = DB::table('categories')->where('status', '<>', 2)->where('parent', 0)->get();

            return view('admin.category.create', compact('parent_categories'));
        }

        $rules = [
            'category_name' => 'required',
            'icon' => 'nullable|mimes:jpeg,jpg,bmp,png,gif,svg'
        ];

        $validation = Validator::make($request->all(), $rules);

        if ($validation->fails()) {

            return response()->json([
                'success' => false,
                'errors' => $validation->errors()
            ]);
        }

        if ($request->input('parent_category') == NULL) {
            $rules = [
                'icon' => 'required|mimes:jpeg,jpg,bmp,png,gif,svg'
            ];

            $validation = Validator::make($request->all(), $rules);

            if ($validation->fails()) {

                return response()->json([
                    'success' => false,
                    'errors' => $validation->errors()
                ]);
            }
        }

        DB::beginTransaction();
        try {

            if ($request->file('icon')) {

                $image = $request->file('icon');
                $date = date('YmdHis');
                $no = str_shuffle('123456789023456789034567890456789905678906789078908909000987654321987654321876543217654321654321543214321321211');
                $random_no = substr($no, 0, 2);
                $final_image_name = $date . $random_no . '.' . $image->getClientOriginalExtension();

                MediaStorage::put('categories', $image, $final_image_name);
            }
            $slug = ltrim(rtrim(strtolower(str_replace(array(' ', '%', '°F', '---', '--'), '-', str_replace(array('&', '?'), '', str_replace('(', '', str_replace(')', '', str_replace(',', '', str_replace('®', '', trim($request->category_name)))))))), '-'), '-');

            // check to see if any other slugs exist that are the same & count them

            $slug_count = DB::table('categories')->whereRaw('slug ~ ?', ['^'.preg_quote($slug).'(-[0-9]+)?$'])->count();

            $slug = $slug_count ? "{$slug}-{$slug_count}" : $slug;

            $data = [
                'name' => $request->input('category_name'),
                'slug' => $slug,
                'parent' => $request->input('parent_category') != NULL ? $request->input('parent_category') : 0,
                'image' => !empty($final_image_name) ? $final_image_name : NULL,
                'status' => 1,
                'created_at' => date('Y-m-d H:i:s')
            ];

            DB::table('categories')->insert($data);

            DB::commit();
            return response()->json([
                'success' => true
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            // something went wrong
            return $e;
        }
    }

    public function edit(Request $request)
    {
        $category_id = base64_decode($request->id);

        if ($request->isMethod('get')) {
            $category = DB::table('categories')->where('id', $category_id)->first();

            $parent_categories = DB::table('categories')->where('status', '<>', 2)->where('parent', 0)->get();

            return view('admin.category.edit', compact('category', 'parent_categories'));
        }

        $rules = [
            'category_name' => 'required',
            'icon' => 'nullable|mimes:jpeg,jpg,bmp,png,gif,svg'
        ];

        $validation = Validator::make($request->all(), $rules);

        if ($validation->fails()) {

            return response()->json([
                'success' => false,
                'errors' => $validation->errors()
            ]);
        }

        $category = DB::table('categories')->where('id', $category_id)->first();

        if ($request->input('parent_category') == NULL && $category->image == NULL) {
            $rules = [
                'icon' => 'required|mimes:jpeg,jpg,bmp,png,gif,svg'
            ];

            $validation = Validator::make($request->all(), $rules);

            if ($validation->fails()) {

                return response()->json([
                    'success' => false,
                    'errors' => $validation->errors()
                ]);
            }
        }

        DB::beginTransaction();
        try {

            if ($request->file('icon')) {

                $image = $request->file('icon');
                $date = date('YmdHis');
                $no = str_shuffle('123456789023456789034567890456789905678906789078908909000987654321987654321876543217654321654321543214321321211');
                $random_no = substr($no, 0, 2);
                $final_image_name = $date . $random_no . '.' . $image->getClientOriginalExtension();

                MediaStorage::put('categories', $image, $final_image_name);
            } else {
                $final_image_name = $category->image;
            }

            $data = [
                'name' => $request->input('category_name'),
                'parent' => $request->input('parent_category') != NULL ? $request->input('parent_category') : 0,
                'image' => !empty($final_image_name) ? $final_image_name : NULL,
                'updated_at' => date('Y-m-d H:i:s')
            ];

            DB::table('categories')->where('id', $category_id)->update($data);

            DB::commit();
            return response()->json([
                'success' => true
            ]);
        } catch (\Exception $e) {
            DB::rollback();
            // something went wrong
            return $e;
        }
    }
    public function slug()
    {
        $category = DB::table('categories')->get();


        foreach ($category as $cate) {
            $slug = ltrim(rtrim(strtolower(str_replace(array(' ', '/', '%', '°F', '---', '--'), '-', str_replace(array('&', '?', "'", '"'), '', str_replace('(', '', str_replace(')', '', str_replace(',', '', str_replace('®', '', trim($cate->name)))))))), '-'), '-');

            // check to see if any other slugs exist that are the same & count them

            $slug_count = DB::table('categories')->whereRaw('slug ~ ?', ['^'.preg_quote($slug).'(-[0-9]+)?$'])->count();

            $slug = $slug_count ? "{$slug}-{$slug_count}" : $slug;


            DB::table('categories')->where('id', $cate->id)->update([
                'slug' => $slug
            ]);
        }
    }

    // public function slugp()
    // {
    //     $category = DB::table('products')->get();
    //     foreach ($category as $cate) {
    //         $slug = ltrim(rtrim(strtolower(str_replace(array(' ','/','%','°F','---','--'),'-',str_replace(array('&','?'),'',str_replace('(','',str_replace(')','', str_replace(',','',str_replace('®','',trim($cate->title)))))))),'-'),'-');

    //         // check to see if any other slugs exist that are the same & count them

    //         $slug_count = DB::table('products')->whereRaw('slug ~ ?', ['^'.preg_quote($slug).'(-[0-9]+)?$'])->count();

    //         $slug = $slug_count ? $slug.'-'.$slug_count.'-'.$cate->id : $slug.'-'.$cate->id;


    //         DB::table('products')->where('id',$cate->id)->update([
    //             'slug' => $slug
    //         ]);
    //     }

    // }
}
