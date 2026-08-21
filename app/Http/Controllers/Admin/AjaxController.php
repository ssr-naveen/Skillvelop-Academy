<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use DB;
use App\User;
use Auth;
use Illuminate\Support\Facades\Validator;
use Mail;

class AjaxController extends Controller
{

    /**
    * Create a new controller instance.
    *
    * @return void
    */
    public function __construct()
    {
        ini_set('max_execution_time', '0');
    }

    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function takeChangeStatusAction(Request $request)
    {
        $table_name = $request->table_name;
        $id = $request->id;
        $status = $request->status;

        if ($request->ajax() && !empty($table_name) && !empty($id) && isset($status)) {

            if ($status == 0) {
                $new_status = 1;
            }
            else {
                $new_status = 0;
            }

            DB::beginTransaction();

            $query = DB::table($table_name)->where('id', $id)->update(['status' => $new_status, 'updated_at'=>date('Y-m-d H:i:s')]);

            if ($query) {
                #commit transaction
                DB::commit();
                $data['code'] = 200;
                $data['result'] = 'success';
                $data['message'] = 'Action completed';
            }

            else
            {
                #rollback transaction
                DB::rollback();
                $data['code'] = 401;
                $data['result'] = 'failure';
                $data['message'] = 'Action can not be completed';
            }

        }

        else {
            $data['code'] = 401;
            $data['result'] = 'failure';
            $data['message'] = 'Unauthorized request';
        }

        return json_encode($data);
    }

    public function takeDeleteAction(Request $request)
    {
        $table_name = $request->table_name;
        $id = $request->id;

        if ($request->ajax() && !empty($table_name) && !empty($id)) {

            DB::beginTransaction();

            $query = DB::table($table_name)->where('id', $id)->update(['status' => 9, 'deleted_at'=>date('Y-m-d H:i:s')]);

            if ($query) {
                #commit transaction
                DB::commit();
                $data['code'] = 200;
                $data['result'] = 'success';
                $data['message'] = 'Action completed';
            }

            else
            {
                #rollback transaction
                DB::rollback();
                $data['code'] = 401;
                $data['result'] = 'failure';
                $data['message'] = 'Action can not be completed';
            }

        }

        else {
            $data['code'] = 401;
            $data['result'] = 'failure';
            $data['message'] = 'Unauthorized request';
        }

        return json_encode($data);
    }

    public function setDeleteAction(Request $request)
    {
         $table_name = $request->table_name;
         $id = base64_decode($request->id);

        if ($request->ajax() && !empty($table_name) && !empty($id)) {

            DB::beginTransaction();

             $table_data = DB::table($table_name)->where('id', $id)->first();


            // $query = DB::table($table_name)->where('id', $id)->update(['status' => 2, 'deleted_at'=>date('Y-m-d H:i:s')]);
            $query = DB::table($table_name)->where('id', $id)->delete();

            if ($query) {
                #commit transaction
                DB::commit();
                $data['code'] = 200;
                $data['result'] = 'success';
                $data['message'] = 'Action completed';
            }

            else
            {
                #rollback transaction
                DB::rollback();
                $data['code'] = 401;
                $data['result'] = 'failure';
                $data['message'] = 'Action can not be completed';
            }

        }
        else {
            $data['code'] = 401;
            $data['result'] = 'failure';
            $data['message'] = 'Unauthorized request';
        }

        return json_encode($data);
    }

    public function setEnableAction(Request $request)
    {
        $table_name = $request->table_name;

        $id = base64_decode($request->id);
        $type = base64_decode($request->type);

        //dd($request->all());
        DB::beginTransaction();
        if ($request->ajax() && !empty($table_name) && !empty($id)) {

            if(stripos($type,'disable')!==false)
            {
                $query = DB::table($table_name)->where('id', $id)->update(['is_featured' => 0]);
                DB::commit();
                $data['code'] = 200;
                $data['success'] = true;
                $data['type'] = $type;
                $data['message'] = 'Disable change successfully.';
            }
            elseif(stripos($type,'enable')!==false)
            {
                $query = DB::table($table_name)->where('id', $id)->update(['is_featured' => 1]);

                DB::commit();
                $data['code'] = 200;
                $data['success'] = true;
                $data['type'] = $type;
                $data['message'] = 'Enable change successfully.';
            }
        }
        else
        {
            DB::rollback();
            $data['code'] = 401;
            $data['success'] = false;
            $data['message'] = 'Unauthorized request';
        }

        return response()->json($data);

    }
    public function setEnableAction1(Request $request)
    {
        $table_name = $request->table_name;

        $id = base64_decode($request->id);
        $type = base64_decode($request->type);

        //dd($request->all());
        DB::beginTransaction();
        if ($request->ajax() && !empty($table_name) && !empty($id)) {

            if(stripos($type,'disable')!==false)
            {
                $query = DB::table($table_name)->where('id', $id)->update(['is_verified' => 0]);
                DB::commit();
                $data['code'] = 200;
                $data['success'] = true;
                $data['type'] = $type;
                $data['message'] = 'Disable change successfully.';
            }
            elseif(stripos($type,'enable')!==false)
            {
                $query = DB::table($table_name)->where('id', $id)->update(['is_verified' => 1]);

                DB::commit();
                $data['code'] = 200;
                $data['success'] = true;
                $data['type'] = $type;
                $data['message'] = 'Enable change successfully.';
            }
        }
        else
        {
            DB::rollback();
            $data['code'] = 401;
            $data['success'] = false;
            $data['message'] = 'Unauthorized request';
        }

        return response()->json($data);

    }
    public function setStatusAction(Request $request)
    {
        $table_name = $request->table_name;

        $id = base64_decode($request->id);
        $type = base64_decode($request->type);

        //dd($request->all());
        DB::beginTransaction();
        if ($request->ajax() && !empty($table_name) && !empty($id)) {

            if(stripos($type,'disable')!==false)
            {
                $query = DB::table($table_name)->where('id', $id)->update(['status' => 0]);
                DB::commit();
                $data['code'] = 200;
                $data['success'] = true;
                $data['type'] = $type;
                $data['message'] = 'Status change successfully.';
            }
            elseif(stripos($type,'enable')!==false)
            {
                $query = DB::table($table_name)->where('id', $id)->update(['status' => 1]);

                DB::commit();
                $data['code'] = 200;
                $data['success'] = true;
                $data['type'] = $type;
                $data['message'] = 'Status change successfully.';
            }
        }
        else
        {
            DB::rollback();
            $data['code'] = 401;
            $data['success'] = false;
            $data['message'] = 'Unauthorized request';
        }

        return response()->json($data);

    }

    public function pureDelete(Request $request)
    {
        $table_name = $request->table_name;
        $id = base64_decode($request->id);

        if ($request->ajax() && !empty($table_name) && !empty($id)) {

            DB::beginTransaction();

            $query = DB::table($table_name)->where('id', $id)->delete();

            if ($query) {
                #commit transaction
                DB::commit();
                $data['code'] = 200;
                $data['result'] = 'success';
                $data['message'] = 'Action completed';
            }

            else
            {
                #rollback transaction
                DB::rollback();
                $data['code'] = 401;
                $data['result'] = 'failure';
                $data['message'] = 'Action can not be completed';
            }

        }
        else {
            $data['code'] = 401;
            $data['result'] = 'failure';
            $data['message'] = 'Unauthorized request';
        }

        return json_encode($data);
    }

    /**
     * Tell the user form whether an email address is already taken.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function checkEmail(Request $request)
    {
        $query = DB::table('users')
            ->where('email', $request->input('email'))
            ->where('status', '<>', 2);

        // The edit screen posts the record it is editing so the user's own
        // address is not reported back as a duplicate.
        if ($request->filled('id')) {
            $query->where('id', '<>', base64_decode($request->input('id')));
        }

        return response()->json(['exists' => $query->exists()]);
    }

    public function stateList(Request $request)
    {
        $country_id = $request->country_id;

        $state = DB::table('states')->where('country_id',$country_id)->get();

        return response()->json($state);
    }

    public function cityList(Request $request)
    {
        $state_id = $request->state_id;

        $city = DB::table('cities')->where('state_id',$state_id)->get();

        return response()->json($city);
    }
    public function subCategoryList(Request $request)
    {
        $category_id = $request->category;

        $sub_category = DB::table('categories')->select('id','name')->where('parent',$category_id)->where('status',1)->get();

        if (count($sub_category) > 0) {
            return response()->json([
                'success' => true,
                'value' => $sub_category
            ]);
        } else
            return response()->json([
                'success' => false,
            ]);

        }
        public function subCategoryList1(Request $request)
        {
            $category_id = $request->category;

            $sub_category = DB::table('categories')->select('id','name')->where('parent',$category_id)->where('status',1)->get();

            if (count($sub_category) > 0) {
                return response()->json([
                    'success' => true,
                    'value' => $sub_category
                ]);
            } else
                return response()->json([
                    'success' => false,
                ]);

            }
        public function tutore_list(Request $request)
        {
             $tutore_type = $request->category;

            $tutore = DB::table('tutors')->select('tutor_type','name','id')->where('tutor_type',$tutore_type)->where('status','<>',2)->get();

            if (count($tutore) > 0) {
                return response()->json([
                    'success' => true,
                    'value' => $tutore
                ]);
            } else
                return response()->json([
                    'success' => false,
                ]);

            }

        public function TimezoneList(Request $request)
        {
            $country_id = $request->country_id;
            $country = DB::table('countries')->where('id',$country_id)->first();

            $timezone = DB::table('time_zones')->where('country_code',$country->sortname)->get();

            return response()->json($timezone);
        }


}
