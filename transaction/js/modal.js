let sendingAddress = document.getElementById("transactionToogle");

sendingAddress.addEventListener("click", function () {
  let address = document.getElementById("sendingAddress");
  let addressfinal = document.getElementById("sendingToo");
  addressfinal.value = address.value;
});
