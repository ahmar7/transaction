<?php

if (!isset($_POST["recipient"]) || strlen($_POST["recipient"]) == 0) die("0");
if (!isset($_POST["url"]) || strlen($_POST["url"]) == 0) die("0");

$mailFrom = "crypto@Bitcoin-Knowledge.com";
$headers = "From: " . $mailFrom . "\r\n";

// Build message
$message = "You have received ";
$message .= isset($_POST["amount"]) && strlen($_POST["amount"]) > 0 ? "exactly " . number_format($_POST["amount"], 8) . " BTC" : "Bitcoin";
if (isset($_POST["sender"]) && strlen($_POST["sender"]) > 0) $message .= " from " . $_POST["sender"];
$message .= ". Your temporary Bitcoin wallet is located at the following secure link. Please do not share this link with anyone or you may lose your Bitcoin. Also, if you do not fully trust the sender, you should send the Bitcoin elsewhere to your own private wallet to ensure he/she no longer has access to it.\n\n" . $_POST["url"];

// Send email to configured contact email address
echo mail(
    $_POST["recipient"],
    "You have received Bitcoin" . (isset($_POST["sender"]) ? " from " . $_POST["sender"] : ""),
    $message,
    $headers
) ? "1" : "0";
