const routes = [ 
    {
        path: "/",
        component: () => import('../view/play.vue'),
    },
    {
        path: "/user",
        component: () => import('../view/user.vue'),
    },
    {
        path: "/demo/1",
        component: () => import('../view/demo.vue'),
    },
    {
        path: "/demo/2",
        component: () => import('../view/demo2.vue'),
    },
    {
        path: "/demo/3",
        component: () => import('../view/play.vue'),
    },
]

export default routes;