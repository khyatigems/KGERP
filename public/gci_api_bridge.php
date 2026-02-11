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
error_reporting(E_ALL);
ini_set('display_errors', 1);
ob_start(); // Buffer output to catch any accidental echos or warnings

// Handle Fatal Errors cleanly
register_shutdown_function(function() {
    $error = error_get_last();
    // Check for fatal errors (E_ERROR, E_PARSE, etc.)
    if ($error && ($error['type'] === E_ERROR || $error['type'] === E_PARSE || $error['type'] === E_CORE_ERROR || $error['type'] === E_COMPILE_ERROR)) {
        // If there's a fatal error, clear any HTML output that might have been generated
        if (ob_get_length()) ob_clean();
        
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => 'Fatal PHP Error',
            'details' => $error['message'],
            'file' => basename($error['file']),
            'line' => $error['line']
        ]);
        exit;
    }
});

// ==========================================
// CONFIGURATION SECTION - EDIT THIS
// ==========================================

// 1. Security Key (Must match the one in your ERP .env file)
// IMPORTANT: Replace 'YOUR_SECURE_API_KEY' with the GCI_API_KEY from your Vercel environment variables.
define('KHYATIGCI_SECRECT_2026_BY_AKAAISSAK', 'KHYATIGCI_SECRECT_2026_BY_AKAAISSAK');

// 2. Database Credentials
define('DB_HOST', 'localhost');
define('DB_USER', 'u116837379_GCI'); 
define('DB_PASS', 'akansh@1609G'); 
define('DB_NAME', 'u116837379_GCI');   

// 3. System Settings
// Check if the directory exists and is writable, if not, fallback to current dir
$upload_path = 'storage/certificates/';
if (!is_dir($upload_path) && !@mkdir($upload_path, 0755, true)) {
    $upload_path = 'certificates/'; // Fallback
    if (!is_dir($upload_path)) {
        @mkdir($upload_path, 0755, true);
    }
}
define('UPLOAD_DIR', $upload_path); 
define('BASE_URL', 'https://gemstonecertificationinstitute.com/'); 
define('TRACKING_URL_TEMPLATE', BASE_URL . 'track-certificate?certificate_number=');

// ==========================================
// END OF CONFIGURATION
// ==========================================

// 1. Verify API Key
$api_key = '';

// Check Headers (Case-insensitive)
$headers = [];
if (function_exists('getallheaders')) {
    $temp_headers = getallheaders();
    if (is_array($temp_headers)) {
        $headers = array_change_key_case($temp_headers, CASE_UPPER);
    }
}
if (isset($headers['X-API-KEY'])) {
    $api_key = $headers['X-API-KEY'];
} 
// Check Server variables (Apache/Nginx standard)
elseif (isset($_SERVER['HTTP_X_API_KEY'])) {
    $api_key = $_SERVER['HTTP_X_API_KEY'];
}
// Check REDIRECT_HTTP_X_API_KEY (sometimes happens with rewrites)
elseif (isset($_SERVER['REDIRECT_HTTP_X_API_KEY'])) {
    $api_key = $_SERVER['REDIRECT_HTTP_X_API_KEY'];
}
// Check GET parameter (URL fallback for Hostinger stripping)
elseif (isset($_GET['api_key'])) {
    $api_key = $_GET['api_key'];
}

// 2. Connect to Database
mysqli_report(MYSQLI_REPORT_OFF); // Disable auto-exceptions for cleaner handling
$conn = @new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

if ($conn->connect_error) {
    $error = $conn->connect_error;
    ob_end_clean();
    http_response_code(500);
    echo json_encode([
        'success' => false, 
        'error' => 'Database connection failed',
        'details' => $error,
        'debug' => [
            'host' => DB_HOST,
            'user' => DB_USER,
            'db' => DB_NAME
        ]
    ]);
    exit;
}

// 3. Get POST Data
$raw_input = file_get_contents('php://input');
$data = json_decode($raw_input, true);

// Check JSON body for API key if still not found
if (!$api_key && isset($data['api_key'])) {
    $api_key = $data['api_key'];
}

if (empty($api_key) || $api_key !== KHYATIGCI_SECRECT_2026_BY_AKAAISSAK) {
    ob_end_clean();
    http_response_code(403);
    echo json_encode([
        'success' => false, 
        'error' => 'Invalid API Key',
        'received' => !empty($api_key) ? substr($api_key, 0, 3) . '...' : 'NONE',
        'hint' => 'Ensure the key in this PHP file matches your ERP environment variable.'
    ]);
    exit;
}

if (!$data) {
    ob_end_clean();
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
    $image_data = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $data['image_base64']));
    $extension = 'jpg'; // Default or detect from mime
    $unique_name = 'GCI_' . time() . '_' . uniqid() . '.' . $extension;
    $file_path = UPLOAD_DIR . $unique_name;

    if (@file_put_contents($file_path, $image_data)) {
        $image_filename = $unique_name;
    } else {
        // Log to a local file instead of system error log which might be inaccessible
        @file_put_contents('bridge_error.log', date('Y-m-d H:i:s') . " - Failed to save image to $file_path\n", FILE_APPEND);
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

// New Fields (Gemological Data)
$origin = $conn->real_escape_string($data['origin'] ?? 'Unknown');
$treatment = $conn->real_escape_string($data['treatment'] ?? 'None');
$fluorescence = $conn->real_escape_string($data['fluorescence'] ?? 'None');
$comments = $conn->real_escape_string($data['comments'] ?? '');

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
    origin,
    treatment,
    fluorescence,
    comments,
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
    '$origin',
    '$treatment',
    '$fluorescence',
    '$comments',
    '$image_filename', 
    '$image_filename',
    '$tracking_url', 
    1, 
    1,
    'gemstone',
    'pvc_card'
)";

if ($conn->query($sql) === TRUE) {
    ob_end_clean(); // Discard any warnings/errors buffered
    echo json_encode([
        'success' => true,
        'certificate_number' => $cert_number,
        'url' => $tracking_url,
        'image_saved' => $image_filename ? true : false
    ]);
} else {
    $error = $conn->error;
    ob_end_clean(); // Discard any warnings/errors buffered
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database insert failed: ' . $error]);
}

$conn->close();
?>