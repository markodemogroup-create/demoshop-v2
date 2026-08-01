export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === "demoshop-v2.pages.dev") {
    url.hostname = "demoshop.rs";
    url.protocol = "https:";
    url.port = "";
    return Response.redirect(url.toString(), 301);
  }

  return context.next();
}
