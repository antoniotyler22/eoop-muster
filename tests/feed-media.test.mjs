// 4.107.0: memes (GIF) and a short video on Word of Mouth posts.
import test from "node:test";
import assert from "node:assert/strict";
import { openApp, sleep } from "./harness.mjs";

const GIF = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
const VID = "data:video/mp4;base64," + "A".repeat(3000);

test("Word of Mouth: a GIF and a video ride in the post and show as <img>/<video>", async () => {
  const a = await openApp({});
  try {
    const r = await a.w.eval(`(async()=>{
      const k=crypto.getRandomValues(new Uint8Array(32));const ek=b64e(k).replace(/\\+/g,"-").replace(/\\//g,"_").replace(/=+$/,"");
      const o={t:"hi",to:{k:"all"},u:0,pics:{ia1bcd:${JSON.stringify(GIF)},iv2bcd:${JSON.stringify(VID)},ibad99:"data:text/html;base64,AAAA"},img:["ia1bcd","iv2bcd","ibad99"]};
      const back=await fdDec(ek,await fdEnc(ek,o));
      const html=feedPicsHTML({img:["ia1bcd","iv2bcd"]});
      document.body.insertAdjacentHTML("beforeend",html);await feedPicsFill();
      const els=[...document.querySelectorAll("[data-fpid]")];
      return {pics:back.pics,ids:back.img,gif:await feedPic("ia1bcd"),vid:await feedPic("iv2bcd"),bad:await feedPic("ibad99"),
        imgShown:!els[0].querySelector("img").hidden,vidShown:!els[1].querySelector("video").hidden,vidSrc:els[1].querySelector("video").src.slice(0,16),viewer:els[1].hasAttribute("data-fpview")}})()`);
    assert.equal(r.pics, undefined, "media leaves the payload");
    assert.equal(r.gif, GIF);
    assert.equal(r.vid, VID);
    assert.ok(!r.bad, "scripts/html are not stored");
    assert.ok(r.imgShown && r.vidShown);
    assert.equal(r.vidSrc, "data:video/mp4;b");
    assert.ok(!r.viewer, "video keeps its own controls");
  } finally { await a.close(); }
});
