// bktk.co.kr / www.bktk.co.kr → bktk.kr 301 리다이렉트 (경로·쿼리 보존)
export default {
  fetch(request) {
    const url = new URL(request.url)
    url.hostname = 'bktk.kr'
    return Response.redirect(url.toString(), 301)
  },
}
