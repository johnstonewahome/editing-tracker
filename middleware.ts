import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";

const isPublicPage = createRouteMatcher(["/login", "/signup"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  if (!isPublicPage(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, "/login");
  }

  if (
    isPublicPage(request) &&
    (await convexAuth.isAuthenticated()) &&
    request.nextUrl.pathname !== "/signup"
  ) {
    return nextjsMiddlewareRedirect(request, "/dashboard");
  }

  return undefined;
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
