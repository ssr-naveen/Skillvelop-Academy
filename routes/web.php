<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\RazorpayController;
/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/
//////////for landing page////////


/////////end landing page section////
Route::get('/', function () {
    return view('welcome');
});


Route::get('student/logout', [App\Http\Controllers\Auth\LoginController::class, 'logout'])->name('student.logout');
Route::get('logout', [App\Http\Controllers\Auth\Admin\LoginController::class, 'logout'])->name('admin.logout');

Route::get('user/login', [App\Http\Controllers\Auth\LoginController::class, 'login_view'])->name('front.login');

//forgot password///////////////////////////

Route::get('forget-password', [App\Http\Controllers\Auth\ForgotPasswordController::class, 'ForgetPassword'])->name('ForgetPasswordGet');
Route::post('forget-password', [App\Http\Controllers\Auth\ForgotPasswordController::class, 'ForgetPasswordStore'])->name('ForgetPasswordPost');
Route::get('reset-password/{token}', [App\Http\Controllers\Auth\ForgotPasswordController::class, 'ResetPassword'])->name('ResetPasswordGet');
Route::post('reset-password', [App\Http\Controllers\Auth\ForgotPasswordController::class, 'ResetPasswordStore'])->name('ResetPasswordPost');


/////////////////////forgetpassword/////////////////////////

Route::post('doUsrlgn', [App\Http\Controllers\Auth\LoginController::class, 'login'])->name('user.dologin');
Route::post('doAdmlgn', [App\Http\Controllers\Auth\Admin\LoginController::class, 'login'])->name('admin.dologin');

// The application ships its own forgot/reset password flow above, and the
// stock controllers here do not implement Laravel's default handlers.
//
// Registration is off: accounts are created from the admin panel. The stock
// register form did not set user_type, so it fell to the column default and
// handed every person who signed up a super administrator account.
Auth::routes(['register' => false, 'reset' => false, 'confirm' => false, 'verify' => false]);
Route::get('admin/login', [App\Http\Controllers\Auth\Admin\LoginController::class, 'login_view'])->name('admin.login');
// Route::get('/home', [App\Http\Controllers\HomeController::class, 'index'])->name('home');
Route::get('/admin/dashboard', [App\Http\Controllers\Admin\HomeController::class, 'index'])->middleware('Admin')->name('admin.dashboard');

//route admin
Route::group(['prefix' => 'admin', 'as' => 'admin.', 'middleware' => ['Admin']], function () {

    Route::get('/user', [App\Http\Controllers\Admin\UserController::class, 'index'])->name('user');
    Route::match(['get', 'post'], '/user/create', [App\Http\Controllers\Admin\UserController::class, 'create'])->name('user.create');
    Route::match(['get', 'post'], '/user/edit/{id}', [App\Http\Controllers\Admin\UserController::class, 'edit'])->name('user.edit');
    Route::post('/enable-action', [App\Http\Controllers\Admin\AjaxController::class, 'setEnableAction'])->name('enable-action');
    Route::post('/status-action', [App\Http\Controllers\Admin\AjaxController::class, 'setStatusAction'])->name('status-action');
    Route::post('/delete-action', [App\Http\Controllers\Admin\AjaxController::class, 'setDeleteAction'])->name('delete-action');
    Route::post('/enable-action1', [App\Http\Controllers\Admin\AjaxController::class, 'setEnableAction1'])->name('enable-action1');

    // slider
    Route::get('/role', [App\Http\Controllers\Admin\RoleController::class, 'index'])->name('role');
    Route::match(['get', 'post'], '/role/create', [App\Http\Controllers\Admin\RoleController::class, 'create'])->name('role.create');
    Route::match(['get', 'post'], '/role/edit/{id}', [App\Http\Controllers\Admin\RoleController::class, 'edit'])->name('role.edit');
    Route::get('/role-permission/{id}', [App\Http\Controllers\Admin\RoleController::class, 'getAddPermissionPage'])->name('role.permission');
    Route::post('/role-permission/update', [App\Http\Controllers\Admin\RoleController::class, 'updateRolePermission'])->name('role.permission');
    ///catecory//

    Route::get('/category', [App\Http\Controllers\Admin\CategoryController::class, 'index'])->name('category');

    Route::match(['get', 'post'], '/category/create', [App\Http\Controllers\Admin\CategoryController::class, 'create'])->name('category.create');

    Route::match(['get', 'post'], '/category/edit/{id}', [App\Http\Controllers\Admin\CategoryController::class, 'edit'])->name('category.edit');
    Route::get('/sub-category-list', [App\Http\Controllers\Admin\AjaxController::class, 'subCategoryList'])->name('sub-category-list');
    Route::get('/sub-category', [App\Http\Controllers\Admin\AjaxController::class, 'subCategoryList1'])->name('sub-category');

    //managepage
    Route::get('/manage-page', [App\Http\Controllers\Admin\ManagePageController::class, 'index'])->name('manage-page');

    Route::match(['get', 'post'], '/manage-page/create', [App\Http\Controllers\Admin\ManagePageController::class,'create'])->name('manage-page.create');

    Route::match(['get', 'post'], '/manage-page/edit/{id}', [App\Http\Controllers\Admin\ManagePageController::class, 'edit'])->name('manage-page.edit');

    //cms
    Route::get('/cms', [App\Http\Controllers\Admin\CmsController::class, 'index'])->name('cms');
    Route::match(['get', 'post'], '/cms/create', [App\Http\Controllers\Admin\CmsController::class,'create'])->name('cms.create');
    Route::match(['get', 'post'], '/cms/edit/{id}', [App\Http\Controllers\Admin\CmsController::class, 'edit'])->name('cms.edit');

    //products
    Route::get('/products', [App\Http\Controllers\Admin\ProductsController::class, 'index'])->name('products');
    Route::match(['get', 'post'], '/products/create', [App\Http\Controllers\Admin\ProductsController::class,'create'])->name('products.create');
    Route::match(['get', 'post'], '/products/edit/{id}', [App\Http\Controllers\Admin\ProductsController::class, 'edit'])->name('products.edit');
    Route::match(['get','post'],'/products/image-gallery/{id}',[App\Http\Controllers\Admin\ProductsController::class, 'productGallery'])->name('products.image-gallery');

    Route::post('/products/remove/image',[App\Http\Controllers\Admin\ProductsController::class, 'removeImage'])->name('products.remove.image');

    ///faq//
    Route::get('/faq', [App\Http\Controllers\Admin\FaqController::class, 'index'])->name('faq');
    Route::match(['get', 'post'], '/faq/create', [App\Http\Controllers\Admin\FaqController::class, 'create'])->name('faq.create');
    Route::match(['get', 'post'], '/faq/edit/{id}', [App\Http\Controllers\Admin\FaqController::class, 'edit'])->name('faq.edit');

    // Coupon Management

    Route::get('/coupons',[App\Http\Controllers\Admin\CouponController::class, 'index'])->name('coupons');

    Route::match(['get','post'],'/coupons/create',[App\Http\Controllers\Admin\CouponController::class, 'create'])->name('coupons.create');

    Route::match(['get','post'],'/coupons/edit/{id}',[App\Http\Controllers\Admin\CouponController::class, 'edit'])->name('coupons.edit');

    // Customer

    Route::get('/customer',[App\Http\Controllers\Admin\CustomerController::class, 'index'])->name('customer');

    Route::match(['get','post'],'/customer/create',[App\Http\Controllers\Admin\CustomerController::class, 'create'])->name('customer.create');

    Route::match(['get','post'],'/customer/edit/{id}',[App\Http\Controllers\Admin\CustomerController::class, 'edit'])->name('customer.edit');

});

// Deployment smoke test: reports whether the database is reachable. Sessions
// are stored in that same database, so the session middleware is skipped here —
// otherwise the check would fail inside the middleware and never report why.
Route::get('health', App\Http\Controllers\HealthController::class)
    ->withoutMiddleware([
        \Illuminate\Session\Middleware\StartSession::class,
        \Illuminate\View\Middleware\ShareErrorsFromSession::class,
        \App\Http\Middleware\VerifyCsrfToken::class,
    ])
    ->name('health');

Route::post('admin/check-email', [App\Http\Controllers\Admin\AjaxController::class, 'checkEmail'])
    ->middleware('Admin')
    ->name('check-email');

// Route::get('{slug}', [App\Http\Controllers\CommonController::class, 'fetch']);

// Serves admin uploads that live in Supabase Storage. Files still present in
// public/uploads are handled by the web server before this route is reached.
Route::get('uploads/{path}', [App\Http\Controllers\UploadController::class, 'show'])
    ->where('path', '.*')
    ->name('uploads.show');
