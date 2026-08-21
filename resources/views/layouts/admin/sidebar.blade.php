<style>
    .dropdown-container {
        display: none;
        background-color: #fafbff;
        padding-left: 8px;
    }

    /* Optional: Style the caret down icon */
    .fa-caret-down {
        float: right;
        padding-right: 8px;
    }
    .sidebar .nav .nav-item.active > .nav-link
    {
        color: #fff;
    }
    .sidebar .nav .nav-item.active > .nav-link i
    {
        color: #fff !important;
    }

    .dropdown-btn {
        padding: 6px 8px 6px 16px;
        text-decoration: none;
        font-size: 20px;
        color: #818181;
        display: block;
        border: none;
        background: none;
        width: 100%;
        text-align: left;
        cursor: pointer;
        outline: none;
    }

    .dropdown-container a {
        padding: 9px 8px 9px 16px;
        text-decoration: none;
        font-size: 0.875rem;
        line-height: 1;
        /* font-size: 20px; */
        color: #6C7383;
        display: block;
        border-bottom: 1px solid #dae7ff;
        background: none;
        width: 100%;
        text-align: left;
        cursor: pointer;
        outline: none;
    }

    button.dropdown-btn {
        color: inherit;
        display: inline-block;
        font-size: 0.875rem;
        line-height: 1;
        vertical-align: middle;
    }

    .nav-link:hover i {
        color: #fff !important;
    }

    .drop-d {
        position: absolute;
        top: 10px;
        right: 0;
    }

    i.fa.fa-angle-right {
        margin-right: 8px;
    }

    .sidebar {
        width: 250px !important;
    }
</style>
<nav class="sidebar sidebar-offcanvas " id="sidebar">
    <ul class="nav">
        @if (Auth::user()->user_type != '0')
            <li class="nav-item">
                <a class="nav-link" href="{{ route('admin.dashboard') }}">
                    <i class="icon-grid menu-icon"></i>
                    <span class="menu-title">Dashboard</span>
                </a>
            </li>
            <?php
            $childs = Helper::get_user_permission();
            $permissions = DB::table('action_masters')
                ->whereIn('id', $childs)
                ->where('parent_id', 0)
                ->orderBy('display_order', 'desc')
                ->get();
            ?>
            @foreach ($permissions as $item)
                <?php $segment = ltrim($item->action, '/'); ?>
                <li class="nav-item {{ Request::segment(2) == $segment ? 'active' : '' }}">
                    <a class="nav-link" href="{{ url('admin/' . $segment) }}">
                        <i class="icon-paper menu-icon"></i>
                        <span class="menu-title">{{ $item->action_title }}</span>
                    </a>
                </li>
            @endforeach
        @else
            <li class="nav-item">
                <a class="nav-link" href="{{ route('admin.dashboard') }}">
                    <i class="fa fa-dashboard menu-icon"></i>
                    <span class="menu-title">Dashboard</span>
                </a>
            </li>
            <li class="nav-item" style="position:relative">
                <button class="dropdown-btn nav-link {{ in_array(Request::segment(2), ['manage-banner', 'category', 'count', 'testimonial', 'featured', 'blog', 'whyknowmerits']) ? 'active' : '' }}">
                    <i class="fa fa-dashboard menu-icon" style="font-size: 1rem; line-height: 1; margin-right: 1rem; color: #6C7383;"></i>
                    Home Management
                    <i class="fa fa-caret-down drop-d"></i>
                </button>
                <div class="dropdown-container" @if(in_array(Request::segment(2), ['category'])) style="display: block;" @endif>
                    <a class="{{ Request::segment(2) == 'category' ? 'text-primary' : '' }}" href="{{ route('admin.category') }}">
                        <i class="fa fa-angle-right"></i> Category Management
                    </a>
                </div>
            </li>
            <li class="nav-item {{Request::segment(2) == 'customer' ? 'active' : ''  }}">
                <a class="nav-link" href="{{ route('admin.customer') }}">
                    <i class="fa fa-info-circle menu-icon"></i>
                    <span class="menu-title">Customer Manage</span>
                </a>
            </li>
            <li class="nav-item {{Request::segment(2) == 'products' ? 'active' : ''  }}">
                <a class="nav-link " href="{{ route('admin.products') }}">
                    <i class="fa fa-user menu-icon"></i>
                    <span class="menu-title">Product Management</span>
                </a>
            </li>
            <!-- <li class="nav-item {{Request::segment(2) == 'user' ? 'active' : ''  }}">
                <a class="nav-link " href="{{ route('admin.user') }}">
                    <i class="fa fa-user menu-icon"></i>
                    <span class="menu-title">User Management</span>
                </a>
            </li> -->
            <!-- <li class="nav-item {{Request::segment(2) == 'role' ? 'active' : ''  }}">
                <a class="nav-link" href="{{ route('admin.role') }}">
                    <i class="fa fa-adjust menu-icon"></i>
                    <span class="menu-title">Role Management</span>
                </a>
            </li> -->
            <li class="nav-item {{Request::segment(2) == 'coupons' ? 'active' : ''  }}">
                <a class="nav-link" href="{{ route('admin.coupons') }}">
                    <i class="fa fa-adjust menu-icon"></i>
                    <span class="menu-title">Coupon Management</span>
                </a>
            </li>
            <li class="nav-item {{Request::segment(2) == 'cms' ? 'active' : ''  }}">
                <a class="nav-link" href="{{ route('admin.cms') }}">
                    <i class="fa fa-info-circle menu-icon"></i>
                    <span class="menu-title">CMS Manage</span>
                </a>
            </li>
            <li class="nav-item {{Request::segment(2) == 'faq' ? 'active' : ''  }}">
                <a class="nav-link" href="{{ route('admin.faq') }}">
                    <i class="fa fa-info-circle menu-icon"></i>
                    <span class="menu-title">Faq's</span>
                </a>
            </li>
    </ul>
    @endif
</nav>



