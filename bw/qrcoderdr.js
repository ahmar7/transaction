const qrReader = new ZXing.BrowserQRCodeReader();
var deviceId;

function closeVideo()
{
    qrReader.reset();
}

function getVideoId()
{
    qrReader.getVideoInputDevices().then((videoDevices) => {
        deviceId = videoDevices[0].deviceId;
    }).catch((err) => {
        console.error(err)
    })
}

function decodeCode()
{
    getVideoId();

    qrReader.decodeFromInputVideoDevice(deviceId, "video").then((result) => {
        console.log(result)

        var qrAddress = result;
        qrAddress = decodeURIComponent(qrAddress);
        console.log(qrAddress);
        if (qrAddress.indexOf(":") > 0) {
            address = qrAddress.match(/[13][1-9A-HJ-NP-Za-km-z]{26,33}/g);
            address = address[0];
            uriAmount = qrAddress.match(/=[0-9\.]+/g);
            qrAddress = address;
            if(qrAddress != null) {
                $("#txtAddress").val(qrAddress);
                if (uriAmount != null) {
                    uriAmount = uriAmount[0].replace("=", "");
                    $("#txtAmount").val( uriAmount );                    
                }
            }
        }
        closeVideo();    
        $("#qrvidBox").hide(); 
        $("#walletInfo").slideDown();
      }).catch((err) => {
        console.error(err)
      })
}