const BLINK_TIMEOUT = 100;

document.addEventListener(
  "DOMContentLoaded",
  function (event) {
    let conn;
    let peer = new Peer();
    let masterPeerId = getJsonFromUrl().id;
    const isHost = !masterPeerId;
    let localStream;
    let peerStream;
    let isBlinkActive = false;
    let isMuted = false;

    let peerLinkEl = document.getElementById("peer-link");
    let callBtnEl = document.getElementById("call");
    let myVideoEl = document.getElementById("my-camera");
    let peerVideoEl = document.getElementById("peer-camera");
    let peerMasterSectionEl = document.getElementById("peer-master-section");
    let blinkEl = document.getElementById("blink");
    let hitEl = document.getElementById("hit");
    let callSection = document.getElementById("call-section");
    let finishBtn = document.getElementById("finish");
    let muteBtn = document.getElementById("mute");
    let outroEl = document.getElementById("outro");
    let acceptCallBtn = document.getElementById("accept-call-btn");
    let incomingCallEl = document.getElementById("incoming-call");

    if (isHost) {
      callBtnEl.style.display = "none";
    } else {
      blinkEl.style.display = "none";
      peerMasterSectionEl.style.display = "none";
    }

    peerVideoEl.muted = false;

    let muteVoice = () => {
      isMuted = !isMuted;
      muteBtn.classList.toggle("active", !isMuted);
      localStream.getAudioTracks()[0].enabled = !isMuted;
    };
    muteBtn.addEventListener("click", muteVoice);

    let destroyPeer = () => {
      conn.send("destroy");
      peer.destroy();
      outroEl.classList.toggle("active", true);
    };

    finishBtn.addEventListener("click", destroyPeer);

    peer.on("open", function () {
      if (isHost) {
        peerLinkEl.value = document.location.origin + "?id=" + peer.id;
      } else {
        conn = peer.connect(masterPeerId);
        setConnectionHandlers();
      }
    });

    peer.on("error", function (err) {
      console.error(err);
    });

    peer.on("connection", function (connection) {
      console.log("connection received", connection);
      conn = connection;
      setConnectionHandlers();
    });

    peer.on("call", function (call) {
      let audio = new Audio("ring.mp3");
      audio.play();

      incomingCallEl.classList.toggle("active", true);

      acceptCallBtn.addEventListener("click", () => {
        call.answer(localStream);
        audio.pause();
        incomingCallEl.classList.toggle("active", false);
      });

      call.on("stream", function (stream) {
        peerStream = stream;
        onReceiveStream(stream, peerVideoEl);
        callSection.style.display = "block";
      });

      call.on("close", function () {
        destroyPeer();
      });
    });

    function setConnectionHandlers() {
      conn.on("error", function (err) {
        console.error(err);
      });
      conn.on("open", function () {
        conn.on("data", handleMessage);
        conn.send("Hello!");
        console.log("open");
      });
    }

    function requestLocalVideo(callbacks) {
      navigator.getUserMedia =
        navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

      navigator.getUserMedia({ audio: true, video: true }, callbacks.success, callbacks.error);
    }

    function onReceiveStream(stream, videoEl) {
      try {
        videoEl.srcObject = stream;
      } catch (err) {
        console.log(err);
      }
    }

    function handleMessage(data) {
      console.log(data);
      if (data === "hit") {
        blinkOnHit();
      } else if (data === "destroy") {
        destroyPeer();
      }
    }

    function blinkOnHit() {
      if (!isHost) {
        return;
      }
      if (isBlinkActive) {
        setTimeout(blinkOnHit, BLINK_TIMEOUT + 10);
        return;
      }
      blinkEl.classList.toggle("active", true);
      isBlinkActive = true;
      setTimeout(() => {
        blinkEl.classList.toggle("active", false);
        isBlinkActive = false;
      }, BLINK_TIMEOUT);
    }

    callBtnEl.addEventListener("click", () => {
      console.log("Calling to " + masterPeerId);
      console.log(peer);

      let call = peer.call(masterPeerId, localStream);

      call.on("stream", function (stream) {
        peerStream = stream;
        console.log("received stream");
        onReceiveStream(stream, peerVideoEl);
        callSection.style.display = "block";
      });
    });

    hitEl.addEventListener("click", () => {
      conn.send("hit");
      blinkOnHit();
      console.log("sending hit");
    });

    requestLocalVideo({
      success: function (stream) {
        localStream = stream;
        onReceiveStream(stream, myVideoEl);
      },
      error: function (err) {
        alert("Cannot get access to your camera and video !");
        console.error(err);
      },
    });
  },
  false
);

function getJsonFromUrl(url) {
  if (!url) url = location.search;
  let query = url.substr(1);
  let result = {};
  query.split("&").forEach(function (part) {
    let item = part.split("=");
    result[item[0]] = decodeURIComponent(item[1]);
  });
  return result;
}
