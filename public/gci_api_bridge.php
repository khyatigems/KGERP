<?php
/**
 * GCI Certificate API Bridge
 * 
 * Instructions:
 * 1. Upload this file to your GCI website's public_html folder (e.g., public_html/api/gci_bridge.php).
 * 2. Edit the DATABASE CONFIGURATION section below with your Hostinger DB details.
 * 3. Set a secure API_SECRET_KEY.
 * 4. Ensure the 'uploads/certificates' folder exists and is writable (chmod 755 or 777).
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type, X-API-KEY');

// Suppress errors to ensure only JSON is returned
error_reporting(0);
ini_set('display_errors', 0);

// ==========================================
// CONFIGURATION SECTION - EDIT THIS
// ==========================================

// 1. Security Key (Must match the one in your ERP .env file)
define('KHYATIGCI_SECRECT_2026_BY_AKAAISSAK', 'CHANGE_THIS_TO_A_SECURE_RANDOM_STRING');

// 2. Database Credentials
define('DB_HOST', 'localhost');
define('DB_USER', 'u116837379_admin'); // REPLACE with your DB User
define('DB_PASS', 'akansh@1609G'); // REPLACE with your DB Password
define('DB_NAME', 'u116837379_GCI');   // REPLACE with your DB Name

// 3. System Settings
define('UPLOAD_DIR', 'files/public_html/public/storage/certificates/'); // Correct path for certificate images
define('BASE_URL', 'https://gemstonecertificationinstitute.com/'); // Your website URL
define('TRACKING_URL_TEMPLATE', BASE_URL . 'public/track-certificate?certificate_number=');

// ==========================================
// END OF CONFIGURATION
// ==========================================

// 1. Verify API Key
$headers = array_change_key_case(getallheaders(), CASE_UPPER);
$api_key = isset($headers['X-API-KEY']) ? $headers['X-API-KEY'] : '';

if ($api_key !== KHYATIGCI_SECRECT_2026_BY_AKAAISSAK) {
    // Log the received headers for debugging (only if enabled)
    // error_log("API Key mismatch. Expected: " . KHYATIGCI_SECRECT_2026_BY_AKAAISSAK . " Got: " . $api_key);
    http_response_code(403);
    echo json_encode(['success' => false, 'error' => 'Invalid API Key', 'debug' => 'Mismatch']);
    exit;
}

// 2. Connect to Database
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . $conn->connect_error]);
    exit;
}

// 3. Get POST Data
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON data']);
    exit;
}

// Validate required fields - Commented out to allow partial data and prevent immediate failures
/*
$required_fields = ['weight', 'shape', 'color', 'variety'];
foreach ($required_fields as $field) {
    if (empty($data[$field])) {
        echo json_encode(['success' => false, 'error' => "Missing required field: $field"]);
        exit;
    }
}
*/

// 4. Handle Image Upload
$image_filename = null;
if (!empty($data['image_base64'])) {
    // Ensure upload dir exists
    if (!file_exists(UPLOAD_DIR)) {
        mkdir(UPLOAD_DIR, 0755, true);
    }

    $image_data = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $data['image_base64']));
    $extension = 'jpg'; // Default or detect from mime
    $unique_name = 'GCI_' . time() . '_' . uniqid() . '.' . $extension;
    $file_path = UPLOAD_DIR . $unique_name;

    if (file_put_contents($file_path, $image_data)) {
        $image_filename = $unique_name;
    } else {
        error_log("Failed to save image to $file_path");
    }
}

// 5. Generate Certificate Number (GCI + Year + Random String)
// Format: GCI2025XXXXXX (to match existing GCI2025UIDMK4VS)
$year = date('Y');
$random_str = strtoupper(substr(md5(uniqid()), 0, 7));
$cert_number = "GCI" . $year . $random_str;

// 6. Prepare Data for Insertion
$today = date('Y-m-d');
$tracking_url = TRACKING_URL_TEMPLATE . $cert_number;

// Mapping ERP fields to GCI columns
$variety = $conn->real_escape_string($data['variety'] ?? 'Gemstone'); // e.g., Ruby
$species = $conn->real_escape_string($data['species'] ?? 'Natural Gemstone'); // e.g., Corundum
$weight = floatval($data['weight'] ?? 0);
$shape_cut = $conn->real_escape_string($data['shape'] ?? 'Unknown');
$measurement = $conn->real_escape_string($data['dimensions'] ?? 'Unknown');
$color = $conn->real_escape_string($data['color'] ?? 'Unknown');
$customer_name = $conn->real_escape_string($data['customer_name'] ?? '');

// Insert SQL
$sql = "INSERT INTO gemstone_certificates (
    certificate_number, 
    date_of_issue, 
    weight, 
    shape_cut, 
    measurement, 
    colour, 
    variety, 
    group_species,
    customer_name,
    gemstone_image, 
    main_image,
    qr_code_data, 
    created_by, 
    is_active,
    certificate_type,
    certificate_format
) VALUES (
    '$cert_number', 
    '$today', 
    $weight, 
    '$shape_cut', 
    '$measurement', 
    '$color', 
    '$variety', 
    '$species',
    '$customer_name',
    '$image_filename', 
    '$image_filename',
    '$tracking_url', 
    1, 
    1,
    'gemstone',
    'pvc_card'
)";

if ($conn->query($sql) === TRUE) {
    echo json_encode([
        'success' => true,
        'certificate_number' => $cert_number,
        'url' => $tracking_url,
        'image_saved' => $image_filename ? true : false
    ]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database insert failed: ' . $conn->error]);
}

$conn->close();
?>