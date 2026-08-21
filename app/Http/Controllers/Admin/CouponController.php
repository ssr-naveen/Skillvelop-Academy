<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Yajra\DataTables\DataTables;
use App\Helpers\Helper;

class CouponController extends Controller
{
    //
    public function index(Request $request)
    {
        if($request->ajax())
        {
            // Check the Expired Coupon Codes

            $exp_coupon_codes=DB::table('coupon_codes')
                    ->whereNotIn('status',[2,3])
                    ->get();

            if(count($exp_coupon_codes)>0)
            {
                foreach($exp_coupon_codes as $code)
                {
                    if($code->end_date!=NULL || $code->end_date!="")
                    {
                        $end_date=date('Y-m-d h:i a',strtotime($code->end_date));
                        $end_times=strtotime($end_date);

                        if(strtotime(date('Y-m-d h:i a')) >= $end_times)
                        {
                            DB::table('coupon_codes')->where('id',$code->id)->update(['status'=>3]);
                        }
                    }
                }
            }

            $coupon_codes = DB::table('coupon_codes')->where('status','<>',2)->get();

            $datatables = Datatables::of($coupon_codes)
            // ->editColumn('check', function ($row) {
            //     return '<span class="form-check mb-0"><input type="checkbox" class="form-check-input check-select" id="chk_sel_"><label class="form-check-label" for="chk_sel_"></label></span>';
            // })
            ->addIndexColumn()
            ->addColumn('expiry_date_time', function ($row) {
                $start_date = '';
                $end_date = '';

                if($row->start_date!=NULL)
                {
                    $start_date = date('d-F-Y h:i A',strtotime($row->start_date));
                }

                if($row->end_date!=NULL)
                {
                    $end_date = date('d-F-Y h:i A',strtotime($row->end_date));
                }

                return '<span>
                            From - '.$start_date.'
                        </span><br>
                        <span>
                            To - '.$end_date.'
                        </span>';
            })
            ->addColumn('total_used', function ($row) {

                return '<span>'.$row->used_limit.' / '.$row->uses_limit.'</span>';
            })
            ->editColumn('created_at', function ($row) {
                return date('d M, Y',strtotime($row->created_at));
            })
            ->editColumn('status', function ($row) {
                $status = '';

                if($row->status==3)
                {
                    $status='<span class="badge badge-danger">Expired</span>';
                }
                elseif($row->status==0)
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

                return $status;
            })
            ->addColumn('action', function($row) {

                $edit_url = url('/admin/coupons/edit',['id'=>base64_encode($row->id)]);

                $action_2 = '<a class="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover"
                                data-bs-toggle="tooltip" data-placement="top" title=""
                                data-bs-original-title="Edit" href="'.$edit_url.'">
                                <i class="fas fa-edit text-info"></i>
                            </a>';

                $action_3 = '<a class="btn btn-icon btn-flush-dark btn-rounded flush-soft-hover deleteBtn"
                                data-bs-toggle="tooltip" data-placement="top" title=""
                                data-bs-original-title="Delete" href="javascript:void(0)" data-id="'.base64_encode($row->id).'">
                                <i class="fas fa-trash text-danger"></i>
                            </a>';
                $action = '<div class="d-flex align-items-center">
                                <div class="d-flex">
                                    '.$action_2.'
                                    '.$action_3.'
                                </div>
                            </div>';
                return $action;
            });

            $datatables = $datatables->rawColumns(['expiry_date_time','total_used','created_at','status','action'])->make(true);

            return $datatables;
        }
        return view('admin.coupon.index');
    }

    public function create(Request $request)
    {
        if($request->isMethod('get'))
        {
            return view('admin.coupon.create');
        }

        $rules= [
            // 'code_name'    => 'required|regex:/^(?=[A-Z])[A-Z0-9]+$/u|min:3|max:10',
            'code_name'    => 'required',
            // 'type'  => 'required|in:percentage,fixed_amount',
            'value' => 'required',
            'uses_limit' => 'required|integer|min:1',
            'start_date' =>  'required|date',
            'end_date' =>'required|date|after_or_equal:start_date',
            // 'start_time'  => 'required|date_format:h:i a',
            // 'end_time'  => 'required|date_format:h:i a',
            'start_time'  => 'required',
            'end_time'  => 'required',
         ];

         $custom=[
             'value.numeric' => 'Value should be numeric or decimal',
             'value.integer' => "Value should must be numeric",
             'code_name.regex' => 'Code Name should be Alphanumeric',
             'uses_limit.integer' => 'Uses Limit must be numeric',

         ];

         $validator = Validator::make($request->all(), $rules, $custom);

         if ($validator->fails()){
             return response()->json([
                 'success' => false,
                 'errors' => $validator->errors()
             ]);
         }

         DB::beginTransaction();
         try{

            // check if couponcode already exist
            $couponcount=DB::table('coupon_codes')->where('title',$request->code_name)->where('status','<>',2)->count();

            if($couponcount > 0)
            {
                return response()->json([
                    'success' => false,
                    'errors' => ['code_name'=> 'Code Name is Already Exist']
                ]);
            }

            $discount_type = 0;

            // if($request->type=='percentage')
            // {
            //     //  dd($request->type);
            //     $rules=[
            //         'value' => 'numeric|min:1|max:5'
            //     ];
            //     $validator = Validator::make($request->all(), $rules,$custom);

            //     if ($validator->fails()){
            //         return response()->json([
            //             'success' => false,
            //             'errors' => $validator->errors()
            //         ]);
            //     }

            //     $discount_type = 0;

            // }
            // else if($request->type=='fixed_amount')
            // {
            //     $rules=[
            //         'value' => 'integer|min:1|max:10'
            //     ];

            //     $validator = Validator::make($request->all(), $rules,$custom);

            //     if ($validator->fails()){
            //         return response()->json([
            //             'success' => false,
            //             'errors' => $validator->errors()
            //         ]);
            //     }

            //     $discount_type = 1;
            // }

            $start_date=date('Y-m-d',strtotime($request->start_date));

            $end_date=date('Y-m-d',strtotime($request->end_date));

            $start_times=strtotime($start_date.' '.$request->start_time);

            $end_times=strtotime($end_date.' '.$request->end_time);

            $diff = $end_times - $start_times;

            if($diff<=0)
            {
                return response()->json([
                    'success' => false,
                    'errors' => ['all'=> 'Enter a appropriate date-time']
                ]);
            }

            //check if end date_time is less than now date_time

            if($end_times < strtotime(date('Y-m-d h:i a')))
            {
                return response()->json([
                    'success' => false,
                    'errors' => ['all'=> 'Enter a appropriate date-time']
                ]);
            }

            $start_datetime=date('Y-m-d H:i:s',$start_times);

            $end_datetime=date('Y-m-d H:i:s',$end_times);

            $data=[
                'title' => $request->code_name,
                'discount' => $request->value,
                // 'discount_type' => $discount_type,
                'uses_limit' => $request->uses_limit,
                'start_date' => $start_datetime,
                'end_date' => $end_datetime,
                'status' => 1,
                'created_at' => date('Y-m-d H:i:s')
            ];

            DB::table('coupon_codes')->insert($data);

            DB::commit();
            return response()->json([
                'success' => true,
            ]);
         }
         catch (\Exception $e) {
            DB::rollback();
            // something went wrong
            return $e;
        }
    }

    public function edit(Request $request)
    {
        $coupon_id = base64_decode($request->id);

        if($request->isMethod('get'))
        {
            $coupon = DB::table('coupon_codes')->where('id',$coupon_id)->first();

            return view('admin.coupon.edit',compact('coupon'));
        }

        $rules= [
            'code_name'    => 'required',
            // 'type'  => 'required|in:percentage,fixed_amount',
            'value' => 'required',
            'uses_limit' => 'required|integer|min:1',
            'start_date' =>  'required|date',
            'end_date' =>'required|date|after_or_equal:start_date',
            'start_time'  => 'required',
            'end_time'  => 'required',
         ];

         $custom=[
             'value.numeric' => 'Value should be numeric or decimal',
             'value.integer' => "Value should must be numeric",
             'code_name.regex' => 'Code Name should be Alphanumeric',
             'uses_limit.integer' => 'Uses Limit must be numeric',

         ];

         $validator = Validator::make($request->all(), $rules, $custom);

         if ($validator->fails()){
             return response()->json([
                 'success' => false,
                 'errors' => $validator->errors()
             ]);
         }

         DB::beginTransaction();
         try{

             // check if couponcode already exist
            $couponcount=DB::table('coupon_codes')
            ->where('title',$request->code_name)
            ->where('status','<>',2)
            ->whereNotIn('id',[$coupon_id])
            ->count();

            if($couponcount > 0)
            {
                return response()->json([
                    'success' => false,
                    'errors' => ['code_name'=> 'Code Name is Already Exist']
                ]);
            }

            $discount_type = 0;

            // if($request->type=='percentage')
            // {
            //     //  dd($request->type);
            //     $rules=[
            //         'value' => 'numeric|min:1|max:5'
            //     ];
            //     $validator = Validator::make($request->all(), $rules,$custom);

            //     if ($validator->fails()){
            //         return response()->json([
            //             'success' => false,
            //             'errors' => $validator->errors()
            //         ]);
            //     }

            //     $discount_type = 0;

            // }
            // else if($request->type=='fixed_amount')
            // {
            //     $rules=[
            //         'value' => 'integer|min:1|max:10'
            //     ];

            //     $validator = Validator::make($request->all(), $rules,$custom);

            //     if ($validator->fails()){
            //         return response()->json([
            //             'success' => false,
            //             'errors' => $validator->errors()
            //         ]);
            //     }

            //     $discount_type = 1;
            // }

            $start_date=date('Y-m-d',strtotime($request->start_date));

            $end_date=date('Y-m-d',strtotime($request->end_date));

            $start_times=strtotime($start_date.' '.$request->start_time);

            $end_times=strtotime($end_date.' '.$request->end_time);

            $diff = $end_times - $start_times;

            if($diff<=0)
            {
                return response()->json([
                    'success' => false,
                    'errors' => ['all'=> 'Enter a appropriate date-time']
                ]);
            }

            //check if end date_time is less than now date_time

            if($end_times < strtotime(date('Y-m-d h:i a')))
            {
                return response()->json([
                    'success' => false,
                    'errors' => ['all'=> 'Enter a appropriate date-time']
                ]);
            }

            $start_datetime=date('Y-m-d H:i:s',$start_times);

            $end_datetime=date('Y-m-d H:i:s',$end_times);

            $data=[
                'title' => $request->code_name,
                'discount' => $request->value,
                // 'discount_type' => $discount_type,
                'uses_limit' => $request->uses_limit,
                'start_date' => $start_datetime,
                'end_date' => $end_datetime,
                'updated_at' => date('Y-m-d H:i:s')
            ];

            DB::table('coupon_codes')->where('id',$coupon_id)->update($data);

            // Check if the End Date & Time is Greater Than Current Time

            if($end_times > strtotime(date('Y-m-d h:i a')))
            {
                DB::table('coupon_codes')
                        ->where(['id'=>$coupon_id,'status'=>3])
                        ->update([
                            'status' => 1
                            ]);
            }

            DB::commit();
            return response()->json([
                'success' => true,
            ]);
         }
         catch (\Exception $e) {
            DB::rollback();
            // something went wrong
            return $e;
        }
    }
}
