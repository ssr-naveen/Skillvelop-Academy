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
use App\Models\CMS;
class CmsController extends Controller
{
    public function index(Request $request){
        if($request->ajax())
        {
            $role = CMS::where('status','<>',2)->orderBy('id','DESC')->get();
            $datatables = Datatables::of($role)
            ->editColumn('check', function ($row) {
                return '<span class="form-check mb-0"><input type="checkbox" class=" id="chk_sel_"><label class="form-check-label" for="chk_sel_"></label></span>';
            })
            ->editColumn('created_at', function ($row) {
                return date('d M, Y',strtotime($row->created_at));
            })
            ->editColumn('description', function ($row) {
                return '<span class="badge badge-soft-danger my-1 me-2">' . $row->description . '</span>';
            })
            // ->editColumn('image', function ($row) {
            //     $image = url('/uploads/managepage/'.$row->image);
            //     return '<img class="mt-2" src="'.$image.'" width="100px" height="70px" alt="img">';
            // })

            ->addColumn('action', function($row) {
                $action_1 = '';
                if($row->status==0)
                {
                    $action_1 = '<a class="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover statusBtn"
                                        data-bs-toggle="tooltip" data-placement="top" title=""
                                        data-bs-original-title="Inactive" href="#" data-dc="'.base64_encode($row->id).'" data-id="'.base64_encode($row->id).'" data-type="'.base64_encode('enable').'">
                                        <span class="icon">
                                        <i class="fas fa-circle-dot" style="color:red;"></i>                                        </span>
                                    </a>
                                    <a class="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover statusBtn d-none"
                                        data-bs-toggle="tooltip" data-placement="top" title=""
                                        data-bs-original-title="Active" href="#" data-ac="'.base64_encode($row->id).'" data-id="'.base64_encode($row->id).'" data-type="'.base64_encode('disable').'">
                                        <span class="icon">
                                        <i class="fas fa-circle-dot" style="color:green;"></i>                                        </span>
                                    </a>';
                    //dd($action_1);
                }
                else
                {
                    $action_1 = '<a class="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover statusBtn d-none"
                                        data-bs-toggle="tooltip" data-placement="top" title=""
                                        data-bs-original-title="Inactive" href="#" data-dc="'.base64_encode($row->id).'" data-id="'.base64_encode($row->id).'" data-type="'.base64_encode('enable').'">
                                        <span class="icon">
                                        <i class="fas fa-circle-dot" style="color:red;"></i>                                        </span>
                                    </a>
                                    <a class="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover statusBtn"
                                        data-bs-toggle="tooltip" data-placement="top" title=""
                                        data-bs-original-title="Active" href="#" data-ac="'.base64_encode($row->id).'" data-id="'.base64_encode($row->id).'" data-type="'.base64_encode('disable').'">
                                        <span class="icon">
                                        <i class="fas fa-circle-dot" style="color:green;"></i>                                        </span>
                                    </a>';
                }

                $edit_url = url('/admin/cms/edit',['id'=>base64_encode($row->id)]);

                $action_2 = '<a href="'.$edit_url.'" class="btn btn-sm btn-clean btn-icon" title="Edit"><i class="fas fa-edit text-info"></i></a>';

                $action_3 = '<a class="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover deleteBtn"
                data-bs-toggle="tooltip" data-placement="top" title=""
                data-bs-original-title="Delete" href="javascript:void(0)" data-id="'.base64_encode($row->id).'">
                <i class="fas fa-trash text-danger"></i>
            </a>';

                $action = '<div class="d-flex align-items-center">
                                <div class="d-flex">
                                '.$action_1.'
                                    '.$action_2.'
                                    '.$action_3.'
                                </div>
                            </div>';
                return $action;
            });

            $datatables = $datatables->rawColumns(['check','action','image','description'])->make(true);

            return $datatables;
        }
        return view('admin.cms.index');
    }

    public function create(Request $request)
    {
        if ($request->isMethod('get')) {
            $manage_pages = CMS::where('status',1)->get();
           return view('admin.cms.create',compact('manage_pages'));
            }

        $rules = [
            'description' => 'required',
            'name' => 'required',
            ];

        $validation = Validator::make($request->all(), $rules);

        if ($validation->fails()) {

            return response()->json([
                'success' => false,
                'errors' => $validation->errors()
            ]);
        }

        DB::beginTransaction();
        try {

            if ($request->file('image')) {

                $image = $request->file('image');
                $date = date('YmdHis');
                $no = str_shuffle('123456789023456789034567890456789905678906789078908909000987654321987654321876543217654321654321543214321321211');
                $random_no = substr($no, 0, 2);
                $final_image_name = $date . $random_no . '.' . $image->getClientOriginalExtension();

                MediaStorage::put('cms', $image, $final_image_name);
            }

            $slug = ltrim(rtrim(strtolower(str_replace(array(' ','/','%','°F','---','--'),'-',str_replace(array('&','?',"'",'"'),'',str_replace('(','',str_replace(')','', str_replace(',','',str_replace('®','',trim($request->name)))))))),'-'),'-');

            // check to see if any other slugs exist that are the same & count them

            $slug_count = DB::table('c_m_s')->whereRaw('slug ~ ?', ['^'.preg_quote($slug).'(-[0-9]+)?$'])->count();

            $slug = $slug_count ? "{$slug}-{$slug_count}" : $slug;

            $data = [

                'description' => $request->input('description'),
                'title' => $request->input('name'),
                'slug' => $slug,
                'image' => !empty($final_image_name) ? $final_image_name : NULL,
                'status' => 1,
                'created_at' =>date('Y-m-d H:i:s'),
            ];
            // dd($data);
            CMS::insert($data);

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
        $manage_pages_id = base64_decode($request->id);

        if($request->isMethod('get'))
        {

            $manage_pages  = CMS::where('id',$manage_pages_id)->first();
            return view('admin.cms.edit' ,compact('manage_pages'));
        }

        $rules = [
            'description' => 'required',
            'name' => 'required',

            ];


        $validation = Validator::make($request->all(), $rules);

        if ($validation->fails()) {

            return response()->json([
                'success' => false,
                'errors' => $validation->errors()
            ]);

        }


        DB::beginTransaction();
        try{
            $manage_pages  = CMS::where('id',$manage_pages_id)->first();


            if ($request->file('image')) {

                $image = $request->file('image');
                $date = date('YmdHis');
                $no = str_shuffle('123456789023456789034567890456789905678906789078908909000987654321987654321876543217654321654321543214321321211');
                $random_no = substr($no, 0, 2);
                $final_image_name = $date . $random_no . '.' . $image->getClientOriginalExtension();

                MediaStorage::put('cms', $image, $final_image_name);
            } else {
                $final_image_name = $manage_pages->image;
            }



            $data = [
                'description' => $request->input('description'),
                'title' => $request->input('name'),
                'image' => !empty($final_image_name) ? $final_image_name : NULL,
                'status' => 1,
                'updated_at' => date('Y-m-d H:i:s')
            ];

            CMS::where('id',$manage_pages_id)->update($data);

            DB::commit();
            return response()->json([
                'success' => true
            ]);
        }
        catch (\Exception $e) {
            DB::rollback();
            // something went wrong
            return $e;
        }
    }

}
