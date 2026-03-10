
import React from 'react';
import { Database, Layout, Search, Code, BookOpen } from 'lucide-react';

export const API_BASE_URL = 'https://artificialfiretiger.com/db';

export const TYPESCRIPT_USAGE_CODE = `/**
 * example-usage.ts - Interaction with JsonDB from TypeScript
 */

interface MyDocument {
  _id?: string;
  name: string;
  email: string;
  age: number;
}

const API_URL = "https://artificialfiretiger.com/db/api.php";

async function callDb(action: string, collection: string = "", body: any = null) {
  const url = \`\${API_URL}?action=\${action}&collection=\${collection}\`;
  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : null
  });
  
  const result = await response.json();
  if (!result.success) throw new Error(result.error);
  return result;
}

// 1. Create a Collection
await callDb('create', 'customers');

// 2. Insert a Document
const newDoc = await callDb('insert', 'customers', {
  name: "Alice Smith",
  email: "alice@example.com",
  age: 28
});

// 3. Find Documents (Query)
const customers = await callDb('find', 'customers', {
  age: { "$gt": 25 }
});

// 4. Update Documents
const updated = await callDb('update', 'customers', {
  query: { email: "alice@example.com" },
  update: { "$set": { age: 29 } }
});

// 5. Delete Documents
const deleted = await callDb('delete', 'customers', {
  age: { "$lt": 18 }
});

// 6. Upload a File
async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(\`\${API_URL}?action=upload\`, {
    method: 'POST',
    body: formData
  });
  return await response.json();
}
`;

export const PHP_SOURCE_CODE = `<?php
/**
 * api.php - REST Interface for JsonDB with File Upload support
 * Strictly PHP 5.3 Compatible
 */

// Handle CORS early
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

header('Content-Type: application/json');

/**
 * Utility function to log queries to collection.log
 */
function log_api_query($action, $collection, $input) {
    $dbDir = dirname(__FILE__) . DIRECTORY_SEPARATOR . 'db';
    if (!is_dir($dbDir)) {
        @mkdir($dbDir, 0777, true);
    }
    $logFile = $dbDir . DIRECTORY_SEPARATOR . 'collection.log';
    $timestamp = date('Y-m-d H:i:s');
    $inputStr = json_encode($input);
    $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : 'unknown';
    $logEntry = "[" . $timestamp . "] IP: " . $ip . " | Action: " . $action . " | Collection: " . $collection . " | Input: " . $inputStr . PHP_EOL;
    @file_put_contents($logFile, $logEntry, FILE_APPEND);
}

// Convert PHP errors to exceptions manually for 5.3 compatibility
function exception_error_handler($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) return;
    throw new ErrorException($message, 0, $severity, $file, $line);
}
set_error_handler('exception_error_handler');

try {
    if (!file_exists('JsonDB.php')) {
        throw new Exception("Backend core file 'JsonDB.php' missing");
    }
    require_once 'JsonDB.php';

    $db = new JsonDB();
    
    $action = isset($_GET['action']) ? $_GET['action'] : 'find';
    $collection = isset($_GET['collection']) ? $_GET['collection'] : '';

    // Handle JSON inputs
    $inputData = file_get_contents('php://input');
    $decodedInput = json_decode($inputData, true);
    $input = is_array($decodedInput) ? $decodedInput : array();

    // Log the query
    log_api_query($action, $collection, $input);

    if ($action == 'upload') {
        if (!isset($_FILES['file'])) throw new Exception("No file uploaded");
        $file = $_FILES['file'];
        $allowed = array('wav', 'mp4', 'jpg', 'png', 'jpeg', 'txt', 'json');
        $fileNameParts = explode('.', $file['name']);
        $ext = strtolower(end($fileNameParts));
        if (!in_array($ext, $allowed)) throw new Exception("File type not allowed: " . $ext);
        
        $uploadDir = 'uploads/';
        if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0777, true);
            @chmod($uploadDir, 0777);
        }
        
        $newName = uniqid('media_', true) . '.' . $ext;
        $target = $uploadDir . $newName;
        
        if (move_uploaded_file($file['tmp_name'], $target)) {
            $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? "https" : "http";
            $host = $_SERVER['HTTP_HOST'];
            $requestUri = $_SERVER['REQUEST_URI'];
            $url = $protocol . "://" . $host . dirname($requestUri) . "/" . $target;
            
            echo json_encode(array(
                'success' => true, 
                'url' => $url, 
                'filename' => $file['name'], 
                'stored_name' => $newName,
                'mime' => $file['type'],
                'size' => $file['size']
            ));
        } else {
            throw new Exception("Failed to save uploaded file.");
        }
    } 
    elseif ($action == 'list') {
        $cols = $db->listCollections();
        echo json_encode(array('success' => true, 'data' => $cols, 'count' => count($cols)));
    } 
    elseif ($action == 'create') {
        if (empty($collection)) throw new Exception("Collection name required");
        $db->createCollection($collection);
        echo json_encode(array('success' => true, 'message' => "Collection " . $collection . " created"));
    } 
    elseif ($action == 'insert') {
        if (empty($collection)) throw new Exception("Collection name required for insert");
        $result = $db->insert($collection, $input);
        echo json_encode(array('success' => true, 'data' => $result));
    } 
    elseif ($action == 'find') {
        if (empty($collection)) throw new Exception("Collection name required for find");
        // UNWRAP QUERY: Check if wrapped in 'query' key, otherwise use whole input
        $query = isset($input['query']) ? $input['query'] : $input;
        $result = $db->find($collection, $query);
        echo json_encode(array('success' => true, 'data' => $result));
    } 
    elseif ($action == 'update') {
        // UNWRAP QUERY: Check if wrapped in 'query' key, otherwise use empty if updating all or error?
        // Usually update expects { "query": {...}, "update": {...} }
        $query = isset($input['query']) ? $input['query'] : array();
        $upd = isset($input['update']) ? $input['update'] : array();
        $count = $db->update($collection, $query, $upd);
        echo json_encode(array('success' => true, 'modified' => $count));
    } 
    elseif ($action == 'delete') {
        if (empty($collection)) throw new Exception("Collection name required for delete");
        // UNWRAP QUERY: Correctly extract the query to match documents for deletion
        $query = isset($input['query']) ? $input['query'] : $input;
        $count = $db->delete($collection, $query);
        echo json_encode(array('success' => true, 'deleted' => $count));
    } 
    elseif ($action == 'drop') {
        $db->drop($collection);
        echo json_encode(array('success' => true));
    } 
    else {
        throw new Exception("Invalid action: " . $action);
    }
} catch (Exception $e) {
    echo json_encode(array(
        'success' => false,
        'error' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine()
    ));
}
?>
`;

export const API_SOURCE_CODE = `<?php
/**
 * JsonDB.php - A MongoDB-style File-based JSON Database Engine
 * Strictly PHP 5.3 Compatible
 */

class JsonDB {
    private $dbPath;

    public function __construct($dbRelativePath = 'db') {
        $baseDir = dirname(__FILE__);
        $targetDir = $baseDir . DIRECTORY_SEPARATOR . trim($dbRelativePath, DIRECTORY_SEPARATOR);
        
        if (!is_dir($targetDir)) {
            if (!@mkdir($targetDir, 0777, true)) {
                $err = error_get_last();
                $msg = isset($err['message']) ? $err['message'] : 'Check permissions';
                throw new Exception("Could not create database directory at: " . $targetDir . ". Error: " . $msg);
            }
            @chmod($targetDir, 0777);
        }
        
        if (!is_writable($targetDir)) {
            throw new Exception("Database directory is NOT writable: " . $targetDir);
        }

        $this->dbPath = $targetDir . DIRECTORY_SEPARATOR;
    }

    private function getFilePath($collection) {
        $safeName = preg_replace('/[^a-z0-9_]/i', '', $collection);
        if (empty($safeName)) throw new Exception("Invalid collection name");
        return $this->dbPath . $safeName . '.json';
    }

    public function listCollections() {
        $files = glob($this->dbPath . '*.json');
        if ($files === false) return array();
        $names = array();
        foreach ($files as $f) {
            $names[] = basename($f, '.json');
        }
        return array_values(array_unique($names));
    }

    private function readCollection($collection) {
        $file = $this->getFilePath($collection);
        if (!file_exists($file)) return array();
        $content = @file_get_contents($file);
        if ($content === false) return array();
        $data = json_decode($content, true);
        return is_array($data) ? $data : array();
    }

    private function writeCollection($collection, $data) {
        $file = $this->getFilePath($collection);
        $options = defined('JSON_PRETTY_PRINT') ? JSON_PRETTY_PRINT : 0;
        $json = json_encode($data, $options);
        if (@file_put_contents($file, $json) === false) {
            $err = error_get_last();
            $msg = isset($err['message']) ? $err['message'] : 'Unknown';
            throw new Exception("Failed to write to " . $file . ". Error: " . $msg);
        }
    }

    public function createCollection($collection) {
        if (empty($collection)) throw new Exception("Collection name cannot be empty");
        $file = $this->getFilePath($collection);
        if (!file_exists($file)) {
            $this->writeCollection($collection, array());
        } else {
            @touch($file);
        }
        return true;
    }

    public function insert($collection, $document) {
        $data = $this->readCollection($collection);
        if (!isset($document['_id'])) {
            $document['_id'] = uniqid('doc_', true);
        }
        $data[] = $document;
        $this->writeCollection($collection, $data);
        return $document;
    }

    public function find($collection, $query = array()) {
        $data = $this->readCollection($collection);
        if (empty($query)) return $data;

        $results = array();
        foreach ($data as $doc) {
            if ($this->match($doc, $query)) {
                $results[] = $doc;
            }
        }
        return $results;
    }

    private function match($doc, $query) {
        if (!is_array($query) || empty($query)) return true;
        
        foreach ($query as $key => $criteria) {
            // Check if key exists in document
            $value = isset($doc[$key]) ? $doc[$key] : null;

            if (is_array($criteria)) {
                $isOperatorQuery = false;
                foreach ($criteria as $op => $expected) {
                    // Check if key is a string and starts with $ (MongoDB operator)
                    if (is_string($op) && strpos($op, '$') === 0) {
                        $isOperatorQuery = true;
                        if ($op == '$eq') { if ($value != $expected) return false; }
                        elseif ($op == '$ne') { if ($value == $expected) return false; }
                        elseif ($op == '$gt') { if ($value <= $expected) return false; }
                        elseif ($op == '$lt') { if ($value >= $expected) return false; }
                        elseif ($op == '$regex') { if (!@preg_match($expected, (string)$value)) return false; }
                        elseif ($op == '$in') { if (!is_array($expected) || !in_array($value, $expected)) return false; }
                    }
                }
                
                // If it's a regular array comparison (sub-object match) and not an operator command
                if (!$isOperatorQuery) {
                    if ($value != $criteria) return false;
                }
            } else {
                // Direct equality check (loosely typed to avoid string/int conversion issues in 5.3)
                if ($value != $criteria) return false;
            }
        }
        return true;
    }

    public function update($collection, $query, $update) {
        $data = $this->readCollection($collection);
        $modifiedCount = 0;

        foreach ($data as $idx => $doc) {
            if ($this->match($doc, $query)) {
                if (isset($update['$set'])) {
                    foreach ($update['$set'] as $k => $v) $data[$idx][$k] = $v;
                }
                if (isset($update['$unset'])) {
                    foreach ($update['$unset'] as $k => $v) unset($data[$idx][$k]);
                }
                $modifiedCount++;
            }
        }

        if ($modifiedCount > 0) {
            $this->writeCollection($collection, $data);
        }
        return $modifiedCount;
    }

    public function delete($collection, $query) {
        $data = $this->readCollection($collection);
        $beforeCount = count($data);
        $newData = array();
        
        foreach ($data as $doc) {
            // If the document DOES NOT match the query, we keep it
            if (!$this->match($doc, $query)) {
                $newData[] = $doc;
            }
        }
        
        $deletedCount = $beforeCount - count($newData);
        if ($deletedCount > 0) {
            $this->writeCollection($collection, $newData);
        }
        return $deletedCount;
    }

    public function drop($collection) {
        $file = $this->getFilePath($collection);
        if (file_exists($file)) {
            if (!@unlink($file)) {
                throw new Exception("Failed to delete " . $file);
            }
            return true;
        }
        return false;
    }
}
`;

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <Layout className="w-5 h-5" /> },
  { id: 'collections', label: 'Collections', icon: <Database className="w-5 h-5" /> },
  { id: 'query', label: 'Query Lab', icon: <Search className="w-5 h-5" /> },
  { id: 'usage', label: 'API Usage', icon: <BookOpen className="w-5 h-5" /> },
  { id: 'source', label: 'PHP Source', icon: <Code className="w-5 h-5" /> },
];
