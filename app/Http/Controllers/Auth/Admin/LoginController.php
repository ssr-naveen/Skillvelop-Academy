<?php

namespace App\Http\Controllers\Auth\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;

class LoginController extends Controller
{
    public function login_view()
    {
        Auth::logout();

        return view('admin.login');
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string',
            'password' => 'required',
        ], [
            'email.required' => 'Please enter your username or email',
        ]);

        $identifier = trim($request->input('email'));

        // Administrators sign in with either their username or their email.
        $user = User::where('username', $identifier)
            ->orWhere('email', $identifier)
            ->first();

        if ($user === null) {
            Session::flash('message', 'This Username is Not Registered in Our System');
            Session::flash('alert-class', 'alert-danger');

            return redirect()->back()->withInput($request->only('email'));
        }

        if ($user->status == 0) {
            Session::flash('message', 'Your Account Has Been Deactivated, Please Contact to System Administrator !!');
            Session::flash('alert-class', 'alert-danger');

            return redirect()->back()->withInput($request->only('email'));
        }

        if (! Auth::attempt(['email' => $user->email, 'password' => $request->input('password')])) {
            Session::flash('message', 'Credentials Not Matched!');
            Session::flash('alert-class', 'alert-danger');

            return redirect()->back()->withInput($request->only('email'));
        }

        $request->session()->regenerate();

        return redirect()->route('admin.dashboard');
    }

    public function logout(Request $request)
    {
        Auth::logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/admin/login');
    }
}
