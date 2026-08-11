// bktk.co.kr / www.bktk.co.kr → zplay.co.kr/bktk 301 리다이렉트
export default {
  fetch() {
    return Response.redirect('https://zplay.co.kr/bktk', 301)
  },
}
