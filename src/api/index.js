import http from './public'

export const getStation = (params) => {
  return http.fetchGet('/hydro/rest/getBelongUser', params);
}

export const userLogin = (params) => {
  return http.fetchPost("/hydro/rest/login", params);
}
