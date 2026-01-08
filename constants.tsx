
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
 * JsonDB.php - A MongoDB-style File-based JSON Database Engine
 * Strictly PHP 5.3 Compatible
 */
error_reporting(E_ALL);
ini_set('display_errors', 0); 

class JsonDB {
    private $dbPath;

    public function __construct($dbRelativePath) {
        if ($dbRelativePath === null) {
            $dbRelativePath = 'db';
        }
        $baseDir = dirname(__FILE__);
        $targetDir = $baseDir . DIRECTORY_SEPARATOR . trim($dbRelativePath, DIRECTORY_SEPARATOR);
        
        if (!is_dir($targetDir)) {
            if (!@mkdir($targetDir, 0777, true)) {
                $err = error_get_last();
                $msg = (isset($err) && isset($err['message'])) ? $err['message'] : 'Check permissions';
                throw new Exception("Could not create database directory: " . $msg);
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
        if (empty($safeName)) {
            throw new Exception("Invalid collection name");
        }
        return $this->dbPath . $safeName . '.json';
    }

    public function listCollections() {
        $files = glob($this->dbPath . '*.json');
        if ($files === false) {
            return array();
        }
        $names = array();
        foreach ($files as $f) {
            $names[] = basename($f, '.json');
        }
        return array_values(array_unique($names));
    }

    private function readCollection($collection) {
        $file = $this->getFilePath($collection);
        if (!file_exists($file)) {
            return array();
        }
        $content = @file_get_contents($file);
        if ($content === false) {
            return array();
        }
        $data = json_decode($content, true);
        if (is_array($data)) {
            return $data;
        } else {
            return array();
        }
    }

    private function writeCollection($collection, $data) {
        $file = $this->getFilePath($collection);
        if (defined('JSON_PRETTY_PRINT')) {
            $json = json_encode($data, JSON_PRETTY_PRINT);
        } else {
            $json = json_encode($data);
        }
        
        if (@file_put_contents($file, $json) === false) {
            $err = error_get_last();
            $msg = (isset($err) && isset($err['message'])) ? $err['message'] : 'Write failed';
            throw new Exception("Failed to write to data store: " . $msg);
        }
    }

    public function createCollection($collection) {
        if (empty($collection)) {
            throw new Exception("Collection name cannot be empty");
        }
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

    public function find($collection, $query) {
        if ($query === null) {
            $query = array();
        }
        $data = $this->readCollection($collection);
        if (empty($query)) {
            return $data;
        }

        $results = array();
        foreach ($data as $doc) {
            if ($this->match($doc, $query)) {
                $results[] = $doc;
            }
        }
        return $results;
    }

    private function match($doc, $query) {
        foreach ($query as $key => $criteria) {
            $value = isset($doc[$key]) ? $doc[$key] : null;

            if (is_array($criteria)) {
                foreach ($criteria as $op => $expected) {
                    if ($op == '$eq') { if ($value !== $expected) { return false; } }
                    else if ($op == '$ne') { if ($value === $expected) { return false; } }
                    else if ($op == '$gt') { if ($value <= $expected) { return false; } }
                    else if ($op == '$lt') { if ($value >= $expected) { return false; } }
                    else if ($op == '$regex') { if (!@preg_match($expected, (string)$value)) { return false; } }
                    else if ($op == '$in') { if (!is_array($expected) || !in_array($value, $expected)) { return false; } }
                }
            } else {
                if ($value !== $criteria) {
                    return false;
                }
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
                    foreach ($update['$set'] as $k => $v) {
                        $data[$idx][$k] = $v;
                    }
                }
                if (isset($update['$unset'])) {
                    foreach ($update['$unset'] as $k => $v) {
                        unset($data[$idx][$k]);
                    }
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

export const API_SOURCE_CODE = `<?php
/**
 * api.php - REST Interface for JsonDB
 * Strictly PHP 5.3 Compatible
 */

// 1. Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit;
}

error_reporting(E_ALL);
ini_set('display_errors', 0);

function send_api_error_response($msg) {
    header("HTTP/1.1 500 Internal Server Error");
    echo json_encode(array(
        'success' => false,
        'error' => $msg
    ));
    exit;
}

try {
    $basePath = dirname(__FILE__);
    $corePath = $basePath . DIRECTORY_SEPARATOR . 'JsonDB.php';
    
    if (!file_exists($corePath)) {
        throw new Exception("Backend core file 'JsonDB.php' missing");
    }
    require_once $corePath;

    $db = new JsonDB('db');
    
    $action = 'ping';
    if (isset($_GET['action'])) {
        $action = $_GET['action'];
    }
    
    $collection = '';
    if (isset($_GET['collection'])) {
        $collection = $_GET['collection'];
    }

    $inputRaw = file_get_contents('php://input');
    $inputJson = json_decode($inputRaw, true);
    $input = array();
    if (is_array($inputJson)) {
        $input = $inputJson;
    }

    if ($action == 'ping') {
        echo json_encode(array('success' => true, 'message' => 'API is online', 'php' => PHP_VERSION));
    } 
    else if ($action == 'upload') {
        if (!isset($_FILES['file'])) {
            throw new Exception("No file uploaded");
        }
        $file = $_FILES['file'];
        $allowed = array('wav', 'mp4', 'jpg', 'png', 'jpeg');
        $fileNameParts = explode('.', $file['name']);
        $ext = strtolower(end($fileNameParts));
        if (!in_array($ext, $allowed)) {
            throw new Exception("File type not allowed");
        }
        
        $uploadDir = $basePath . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR;
        if (!is_dir($uploadDir)) {
            @mkdir($uploadDir, 0777, true);
            @chmod($uploadDir, 0777);
        }
        
        $newName = uniqid('media_', true) . '.' . $ext;
        $target = $uploadDir . $newName;
        
        if (move_uploaded_file($file['tmp_name'], $target)) {
            $protocol = "http";
            if (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') {
                $protocol = "https";
            }
            $host = $_SERVER['HTTP_HOST'];
            $reqUri = $_SERVER['REQUEST_URI'];
            $dirPath = '/db';
            $url = $protocol . "://" . $host . $dirPath . "/uploads/" . $newName;
            
            echo json_encode(array(
                'success' => true, 
                'url' => $url, 
                'filename' => $file['name'], 
                'size' => $file['size']
            ));
        } else {
            throw new Exception("Failed to move uploaded file.");
        }
    }
    else if ($action == 'list') {
        $cols = $db->listCollections();
        echo json_encode(array('success' => true, 'data' => $cols));
    }
    else if ($action == 'create') {
        if (empty($collection)) {
            throw new Exception("Collection name required");
        }
        $db->createCollection($collection);
        echo json_encode(array('success' => true, 'message' => "Created " . $collection));
    }
    else if ($action == 'insert') {
        if (empty($collection)) {
            throw new Exception("Collection name required");
        }
        $res = $db->insert($collection, $input);
        echo json_encode(array('success' => true, 'data' => $res));
    }
    else if ($action == 'find') {
        if (empty($collection)) {
            throw new Exception("Collection name required");
        }
        $res = $db->find($collection, $input);
        echo json_encode(array('success' => true, 'data' => $res));
    }
    else if ($action == 'update') {
        $query = array();
        if (isset($input['query'])) {
            $query = $input['query'];
        }
        $upd = array();
        if (isset($input['update'])) {
            $upd = $input['update'];
        }
        $modCount = $db->update($collection, $query, $upd);
        echo json_encode(array('success' => true, 'modified' => $modCount));
    }
    else if ($action == 'delete') {
        $delCount = $db->delete($collection, $input);
        echo json_encode(array('success' => true, 'deleted' => $delCount));
    }
    else if ($action == 'drop') {
        $db->drop($collection);
        echo json_encode(array('success' => true));
    }
    else {
        throw new Exception("Invalid action: " . $action);
    }
} catch (Exception $e) {
    send_api_error_response($e->getMessage());
}
`;

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <Layout className="w-5 h-5" /> },
  { id: 'collections', label: 'Collections', icon: <Database className="w-5 h-5" /> },
  { id: 'query', label: 'Query Lab', icon: <Search className="w-5 h-5" /> },
  { id: 'usage', label: 'API Usage', icon: <BookOpen className="w-5 h-5" /> },
  { id: 'source', label: 'PHP Source', icon: <Code className="w-5 h-5" /> },
];
