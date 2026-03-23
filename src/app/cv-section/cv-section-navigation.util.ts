import { ActivatedRouteSnapshot } from '@angular/router';

export const CV_SECTION_HOME_ROUTE = '/cv-section/home';
export const CV_SECTION_ADMIN_ROUTE = '/cv-section/admin';
export const CV_SECTION_LOGIN_ROUTE = '/cv-section/login';
export const CV_SECTION_RETURN_TO_QUERY_PARAM = 'returnTo';

export function resolveCvSectionBackRoute(route: ActivatedRouteSnapshot): string {
  const returnTo = route.queryParamMap.get(CV_SECTION_RETURN_TO_QUERY_PARAM);
  return returnTo === 'admin' ? CV_SECTION_ADMIN_ROUTE : CV_SECTION_HOME_ROUTE;
}

