<!DOCTYPE html>
<html lang="en">

<head>
    <!-- Required meta tags -->
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <title>Know Merit Admin</title>
    <!-- plugins:css -->
    <link rel="stylesheet" href="../Admin/vendors/feather/feather.css">
    <link rel="stylesheet" href="../Admin/vendors/ti-icons/css/themify-icons.css">
    <link rel="stylesheet" href="../Admin/vendors/css/vendor.bundle.base.css">
    <!-- endinject -->
    <!-- Plugin css for this page -->
    <!-- End plugin css for this page -->
    <!-- inject:css -->
    <link rel="stylesheet" href="../Admin/css/vertical-layout-light/style.css">
    <!-- endinject -->
    <link rel="shortcut icon" href="../Admin/images/favicon.png" />
</head>

<body>
    <div class="container-scroller">
        <div class="container-fluid page-body-wrapper full-page-wrapper">
            <div class="content-wrapper d-flex align-items-center auth px-0">
                <div class="row w-100 mx-0">
                    <div class="col-lg-4 mx-auto">
                        <div class="auth-form-light text-left py-5 px-4 px-sm-5">
                            <div class="brand-logo" style="text-align:center;">
                                <img src="{{ asset('admin-assets/Logo-1.png') }}" alt="logo">
                            </div>
                            <h4>Hello! let's get started</h4>
                            <h6 class="font-weight-light">Sign in to continue.</h6>
                            <div class="row">
                                <div class="col-12">
                                    @if (Session::has('message'))
                                        <p class="alert {{ Session::get('alert-class', 'alert-info') }}">
                                            {{ Session::get('message') }}</p>
                                    @endif
                                </div>
                            </div>
                            <form method="post" action="{{ route('admin.dologin') }}" class="singin-form">
                                @csrf

                                <div class="form-group">
                                    <input type="text" class="form-control form-control-lg" id="email"
                                        name="email" value="{{ old('email') }}" placeholder="Username or Email"
                                        autocomplete="username" autofocus>
                                    @error('email')
                                        <p class="text-danger" role="alert">
                                            <strong>{{ $message }}</strong>
                                        </p>
                                    @enderror
                                </div>
                                <div class="form-group" style="position: inherit;">
                                    <div>
                                        <input type="password" class="form-control form-control-lg" id="password"
                                            name="password" placeholder="Password">
                                        <i class="far fa-eye" id="togglePassword"
                                            style="margin-top: -28px; cursor: pointer; position: absolute;right: 0;margin-right: 74px;"></i>
                                    </div>
                                    @error('password')
                                        <p class="text-danger" role="alert">
                                            <strong>{{ $message }}</strong>
                                        </p>
                                    @enderror
                                </div>
                                <div class="mt-3">
                                    <button class="btn btn-primary d-grid w-100" type="submit">Sign in</button>
                                </div>
                                {{-- <div class="my-2 d-flex justify-content-between align-items-center">
                  <div class="form-check">
                    <label class="form-check-label text-muted">
                      <input type="checkbox" class="form-check-input">
                      Keep me signed in
                    </label>
                  </div>
                  <a href="#" class="auth-link text-black">Forgot password?</a>
                </div>
                <div class="mb-2">
                  <button type="button" class="btn btn-block btn-facebook auth-form-btn">
                    <i class="ti-facebook mr-2"></i>Connect using facebook
                  </button>
                </div>
                <div class="text-center mt-4 font-weight-light">
                  Don't have an account? <a href="register.html" class="text-primary">Create</a>
                </div> --}}
                            </form>
                        </div>
                    </div>
                </div>
            </div>
            <!-- content-wrapper ends -->
        </div>
        <!-- page-body-wrapper ends -->
    </div>
    <!-- container-scroller -->
    <!-- plugins:js -->
    <script src="../Admin/vendors/js/vendor.bundle.base.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" crossorigin="anonymous" referrerpolicy="no-referrer" />

    <!-- endinject -->
    <!-- Plugin js for this page -->
    <!-- End plugin js for this page -->
    <!-- inject:js -->
    <script src="../Admin/js/off-canvas.js"></script>
    <script src="../Admin/js/hoverable-collapse.js"></script>
    <script src="../Admin/js/template.js"></script>
    <script src="../Admin/js/settings.js"></script>
    <script src="../Admin/js/todolist.js"></script>
    <!-- endinject -->
</body>

</html>
<script>
    const togglePassword = document.querySelector('#togglePassword');
    const password = document.querySelector('#password');

    togglePassword.addEventListener('click', function(e) {
        // toggle the type attribute
        const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
        password.setAttribute('type', type);
        // toggle the eye slash icon
        // this.classList.toggle('fa-eye-slash');
        $(this).toggleClass('fa fa-eye fa-eye-slash');
    });
</script>
