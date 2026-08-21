<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Providers\RouteServiceProvider;
use Illuminate\Foundation\Auth\AuthenticatesUsers;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use Laravel\Socialite\Facades\Socialite;
use Exception;
class LoginController extends Controller
{

    public function index()
    {
        $tz     = Auth::user()->load('StudentDetail.TimeZone');
        $tz     = ($tz->StudentDetail != null && $tz->StudentDetail->TimeZone!=null)?$tz->StudentDetail->TimeZone->timezone:'Europe/Berlin';
        $i      = 0;
        $date   = new \DateTime();
        $date->setTimezone(new \DateTimeZone($tz));
        $cur_date = $date->format('Y-m-d H:i:s');
        $data0    = array();
        $data1    = array();
        $data2    = array();

        $upcommit = BookSession::where('student_id',auth()->user()->id)
                    ->whereDate('end_time', '>', $cur_date)
                    ->orderBy('id','DESC')
                    ->get();

        // $past =     BookSession::where('student_id',auth()->user()->id)
        //             ->whereDate('end_time', '<', $cur_date)
        //             ->orderBy('id','DESC')
        //             ->get();

        $date_set = [$date->format('Y-m-d')];
        while($i<5)
        {
            $date->modify('-1 month');
            $date_set[] = $date->format('Y-m-d');
            $data0[] = $date->format('M Y');
            $i++;
        }

        foreach($date_set as $ds)
        {
            $data1[] = Order::where(['user_id'=>Auth::user()->id,'is_completed'=>1])
                            ->whereYear('created_at', date('Y',strtotime($ds)))
                            ->whereMonth('created_at', date('m',strtotime($ds)))
                            ->count();

            $data2[] = CreditLog::where(['user_id'=>Auth::user()->id])
                            ->whereYear('created_at', date('Y',strtotime($ds)))
                            ->whereMonth('created_at', date('m',strtotime($ds)))
                            ->sum('credit');

        }

        // dd($data2);
        return view('front.student-dashboard',compact('upcommit','tz','data0','data1','data2'));
    }

    public function login(Request $request){

       $val = session()->get('find_t');
    //    dd($val);

        $request->validate([
            'email' => 'required|exists:users,email',
            'password' => 'required'
        ],
        [
            'email.exists' => 'This Email is Not Registered in Our System'
        ]
        );

        $is_email = User::where(['email'=>$request->email,'status'=>'0'])->latest()->first();
        $is_email1 = User::where(['email'=>$request->email,'status'=>'1'])->latest()->first();
        $is_deleted = User::where(['email'=>$request->email,'status'=>'2'])->latest()->first();
        if(!$is_email && !$is_email1){
            if($is_deleted!=NULL)
            {
                Session::flash('message', 'Your Account Has Been Deleted, Please Contact to System Administrator !!');
                Session::flash('alert-class', 'alert-danger');

                return redirect()->back();
            }
        }

        $deactive = User::where(['email'=>$request->email,'status'=>'0'])->latest()->first();

        if($deactive!=NULL)
        {
            Session::flash('message', 'Your account has been created & is under review. You will be notified once your account is approved.');
            Session::flash('alert-class', 'alert-danger');

            return redirect()->back();
        }
        $user = User::where(['email'=>$request->email])->whereIn('user_type',[2,3])->latest()->first();//,'user_type'=>'1'
        if($user){
            $check = $request->only('email','password');

            if(Auth::attempt($check))
            {
                if(Auth::user()->user_type == '2')
                {
                    if(Session::has('contact')){
                        session()->forget('contact');
                        return redirect('/trainer-list');
                    }
                    if(Session::has('ct_id')){
                        $id = session()->get('ct_id');
                        session()->forget('ct_id');
                        return redirect('/instructor-profile/'.$id);
                    }


                    // if(Session::has('support') && Session::get('support')== true){
                    //     session()->forget('support');
                    //     return redirect('student/messages?user=1');
                    // }
                    return redirect('/teacher/teacher-instructor-dashboard');
                }
                elseif(Auth::user()->user_type == '3')
                {
                    if(Session::has('contact')){
                        session()->forget('contact');
                        return redirect('/trainer-list');
                    }
                    if(Session::has('ct_id')){
                        $id = session()->get('ct_id');
                        // dd($id);
                        session()->forget('ct_id');
                        return redirect('/instructor-profile/'.$id);
                    }
                    if($val){
                        session()->forget('find_t');
                        return redirect('/trainer-list');
                    }
                    else{
                        return redirect('/student/student-dashboard');

                    }
                }
            }
            else
            {
                Session::flash('message', "The password that you've entered is incorrect.");
                Session::flash('alert-class', 'alert-danger');

                return redirect()->back();
            }
        }
        else
        {
            Session::flash('message', 'Login Failed!');
            Session::flash('alert-class', 'alert-danger');

            return redirect()->back();
        }
    }
    public function logout(Request $request)
    {
        Auth::logout();

        return redirect()->route('front.login');
    }

    /**
     * Laravel's default /login route points here. Reuse the front login view so
     * the link on the landing page resolves instead of erroring.
     *
     * @return \Illuminate\Http\Response
     */
    public function showLoginForm()
    {
        return $this->login_view();
    }

    public function login_view()
    {
        if(Auth::check() && Auth::user()->user_type != 0){
            return redirect('/');
        }else{
            return view('front.login');
        }
    }

}
