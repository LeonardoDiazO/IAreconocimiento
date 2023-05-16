document.addEventListener("DOMContentLoaded", function(event) {
    var video = document.getElementById("videoElement");
    var canvas = document.getElementById("canvas");
    var context = canvas.getContext("2d");
    var model;
  
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(function(stream) {
        video.srcObject = stream;
        video.addEventListener("loadedmetadata", function() {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          initModel();
        });
      })
      .catch(function(error) {
        console.log("Se produjo un error al acceder a la cámara: " + error);
      });
  
    function initModel() {
      cocoSsd.load().then(function(loadedModel) {
        model = loadedModel;
        detectObjects();
      });
    }
  
    function detectObjects() {
      model.detect(video).then(function(predictions) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        for (var i = 0; i < predictions.length; i++) {
          var prediction = predictions[i];
          drawBoundingBox(prediction.bbox, prediction.class);
        }
        requestAnimationFrame(detectObjects);
      });
    }
  
    function drawBoundingBox(bbox, label) {
      context.beginPath();
      context.rect(bbox[0], bbox[1], bbox[2], bbox[3]);
      context.lineWidth = 2;
      context.strokeStyle = "blue";
      context.fillStyle = "red" ;
      context.font = "25px Arial";
      context.stroke();
      context.fillText(label, bbox[0], bbox[1] > 10 ? bbox[1] - 5 : 10);
    }
  });
  