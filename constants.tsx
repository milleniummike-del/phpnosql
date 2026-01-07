
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
 */
error_reporting(E_ALL);
ini_set('display_errors', 0); 

class JsonDB {
    private $dbPath;

    public function __construct($dbPath = './db/') {
        // Use absolute path for reliability
        $this->dbPath = realpath(dirname(__FILE__)) . '/' . trim($dbPath, '/') . '/';
        
        if (!is_dir($this->dbPath)) {
            if (!mkdir($this->dbPath, 0777, true)) {
                $err = error_get_last();
                throw new Exception("Could not create database directory at: " . $this->dbPath . ". Error: " . ($err['message'] ?? 'Unknown'));
            }
            chmod($this->dbPath, 0777);
        }
        
        if (!is_writable($this->dbPath)) {
            throw new Exception("Database directory is NOT writable: " . $this->dbPath . ". Please CHMOD 777 this folder.");
        }
    }

    private function getFilePath($collection) {
        return $this->dbPath . preg_replace('/[^a-z0-9_]/i', '', $collection) . '.json';
    }

    public function listCollections() {
        $files = glob($this->dbPath . '*.json');
        if ($files === false) return [];
        return array_values(array_unique(array_map(function($f) {
            return basename($f, '.json');
        }, $files)));
    }

    private function readCollection($collection) {
        $file = $this->getFilePath($collection);
        if (!file_exists($file)) return [];
        $content = file_get_contents($file);
        if ($content === false) return [];
        $data = json_decode($content, true);
        return is_array($data) ? $data : [];
    }

    private function writeCollection($collection, $data) {
        $file = $this->getFilePath($collection);
        $json = json_encode($data, JSON_PRETTY_PRINT);
        if (file_put_contents($file, $json) === false) {
            $err = error_get_last();
            throw new Exception("Failed to write to " . $file . ". Error: " . ($err['message'] ?? 'Unknown'));
        }
    }

    public function createCollection($collection) {
        if (empty($collection)) throw new Exception("Collection name cannot be empty");
        $file = $this->getFilePath($collection);
        if (!file_exists($file)) {
            $this->writeCollection($collection, []);
        } else {
            // Even if it exists, ensure we can touch it
            touch($file);
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

    public function find($collection, $query = []) {
        $data = $this->readCollection($collection);
        if (empty($query)) return $data;

        return array_values(array_filter($data, function($doc) use ($query) {
            return $this->match($doc, $query);
        }));
    }

    private function match($doc, $query) {
        foreach ($query as $key => $criteria) {
            $value = isset($doc[$key]) ? $doc[$key] : null;

            if (is_array($criteria)) {
                foreach ($criteria as $op => $expected) {
                    switch ($op) {
                        case '$eq': if ($value !== $expected) return false; break;
                        case '$ne': if ($value === $expected) return false; break;
                        case '$gt': if ($value <= $expected) return false; break;
                        case '$lt': if ($value >= $expected) return false; break;
                        case '$regex': if (!preg_match($expected, (string)$value)) return false; break;
                        case '$in': if (!in_array($value, $expected)) return false; break;
                    }
                }
            } else {
                if ($value !== $criteria) return false;
            }
        }
        return true;
    }

    public function update($collection, $query, $update) {
        $data = $this->readCollection($collection);
        $modifiedCount = 0;

        foreach ($data as &$doc) {
            if ($this->match($doc, $query)) {
                if (isset($update['$set'])) {
                    foreach ($update['$set'] as $k => $v) $doc[$k] = $v;
                }
                if (isset($update['$unset'])) {
                    foreach ($update['$unset'] as $k => $v) unset($doc[$k]);
                }
                $modifiedCount++;
            }
        }

        $this->writeCollection($collection, $data);
        return $modifiedCount;
    }

    public function delete($collection, $query) {
        $data = $this->readCollection($collection);
        $beforeCount = count($data);
        $data = array_values(array_filter($data, function($doc) use ($query) {
            return !$this->match($doc, $query);
        }));
        $this->writeCollection($collection, $data);
        return $beforeCount - count($data);
    }

    public function drop($collection) {
        $file = $this->getFilePath($collection);
        if (file_exists($file)) {
            if (!unlink($file)) {
                throw new Exception("Failed to delete " . $file);
            }
            return true;
        }
        return false;
    }
}
?>
`;

export const API_SOURCE_CODE = `<?php
/**
 * api.php - REST Interface for JsonDB with File Upload support
 */

// Handle CORS early
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

header('Content-Type: application/json');

// Convert PHP errors to exceptions
set_error_handler(function($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) return;
    throw new ErrorException($message, 0, $severity, $file, $line);
});

try {
    if (!file_exists('JsonDB.php.txt')) {
        throw new Exception("Backend core file 'JsonDB.php.txt' missing from " . realpath(dirname(__FILE__)));
    }
    require_once 'JsonDB.php.txt';

    $db = new JsonDB();
    $action = $_GET['action'] ?? 'find';
    $collection = $_GET['collection'] ?? '';

    // Handle JSON inputs for CRUD
    $inputData = file_get_contents('php://input');
    $input = json_decode($inputData, true) ?? [];

    switch ($action) {
        case 'upload':
            if (!isset($_FILES['file'])) throw new Exception("No file uploaded");
            $file = $_FILES['file'];
            $allowed = ['wav', 'mp4', 'jpg', 'png', 'jpeg'];
            $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
            if (!in_array($ext, $allowed)) throw new Exception("File type not allowed: $ext");
            
            $uploadDir = 'uploads/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
                chmod($uploadDir, 0777);
            }
            
            $newName = uniqid('media_', true) . '.' . $ext;
            $target = $uploadDir . $newName;
            
            if (move_uploaded_file($file['tmp_name'], $target)) {
                $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
                $host = $_SERVER['HTTP_HOST'];
                $requestUri = $_SERVER['REQUEST_URI'];
                $dir = dirname($requestUri);
                // Clean up directory path for the URL
                $dir = ($dir === '\\' || $dir === '/') ? '' : $dir;
                $url = "$protocol://$host$dir/$target";
                
                echo json_encode([
                    'success' => true, 
                    'url' => $url, 
                    'filename' => $file['name'], 
                    'stored_name' => $newName,
                    'mime' => $file['type'],
                    'size' => $file['size']
                ]);
            } else {
                throw new Exception("Failed to save uploaded file. Check folder permissions.");
            }
            break;

        case 'list':
            $cols = $db->listCollections();
            echo json_encode(['success' => true, 'data' => $cols, 'count' => count($cols)]);
            break;
        case 'create':
            if (empty($collection)) throw new Exception("Collection name required");
            $db->createCollection($collection);
            echo json_encode(['success' => true, 'message' => "Collection $collection created"]);
            break;
        case 'insert':
            if (empty($collection)) throw new Exception("Collection name required for insert");
            $result = $db->insert($collection, $input);
            echo json_encode(['success' => true, 'data' => $result]);
            break;
        case 'find':
            if (empty($collection)) throw new Exception("Collection name required for find");
            $result = $db->find($collection, $input);
            echo json_encode(['success' => true, 'data' => $result]);
            break;
        case 'update':
            $count = $db->update($collection, $input['query'] ?? [], $input['update'] ?? []);
            echo json_encode(['success' => true, 'modified' => $count]);
            break;
        case 'delete':
            $count = $db->delete($collection, $input);
            echo json_encode(['success' => true, 'deleted' => $count]);
            break;
        case 'drop':
            $db->drop($collection);
            echo json_encode(['success' => true]);
            break;
        default:
            throw new Exception("Invalid action: " . $action);
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'file' => basename($e->getFile()),
        'line' => $e->getLine(),
        'path' => $e->getFile()
    ]);
}
?>
`;

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: <Layout className="w-5 h-5" /> },
  { id: 'collections', label: 'Collections', icon: <Database className="w-5 h-5" /> },
  { id: 'query', label: 'Query Lab', icon: <Search className="w-5 h-5" /> },
  { id: 'usage', label: 'API Usage', icon: <BookOpen className="w-5 h-5" /> },
  { id: 'source', label: 'PHP Source', icon: <Code className="w-5 h-5" /> },
];
