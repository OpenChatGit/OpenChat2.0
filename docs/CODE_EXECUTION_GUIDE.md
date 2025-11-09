# 🚀 Canvas Code Execution - Vollständiger Leitfaden

## Übersicht

Der Canvas-Editor unterstützt die Ausführung von Code in 12+ Programmiersprachen mit automatischer Erkennung, Kompilierung und Ausführung.

## 📋 Unterstützte Sprachen

### Interpretierte Sprachen (Direkte Ausführung)

#### 🐍 Python
```python
# Automatische Package-Installation
import requests
import numpy as np

response = requests.get('https://api.github.com')
print(f"Status: {response.status_code}")

arr = np.array([1, 2, 3, 4, 5])
print(f"Mean: {arr.mean()}")
```

**Features:**
- ✅ Automatische Package-Installation bei fehlenden Modulen
- ✅ Isolierte virtuelle Umgebung (venv)
- ✅ Unterstützung für alle pip-Packages
- ✅ Fehlerbehandlung mit Auto-Retry

**Ausführung:** `python script.py` (in venv)

---

#### 📜 JavaScript
```javascript
// Browser-ähnliche Ausführung
const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((a, b) => a + b, 0);
console.log(`Sum: ${sum}`);

// Async/Await Support
async function fetchData() {
    console.log('Fetching data...');
    return { status: 'success' };
}

fetchData().then(data => console.log(data));
```

**Features:**
- ✅ Direkte Ausführung via eval()
- ✅ Console.log Capturing
- ✅ Async/Await Support
- ✅ ES6+ Syntax

**Ausführung:** Direkt im Browser-Kontext

---

#### 💎 Ruby
```ruby
# Ruby Script Execution
require 'json'

class Person
  attr_accessor :name, :age
  
  def initialize(name, age)
    @name = name
    @age = age
  end
  
  def to_json(*args)
    { name: @name, age: @age }.to_json(*args)
  end
end

person = Person.new("Alice", 30)
puts JSON.pretty_generate(JSON.parse(person.to_json))
```

**Features:**
- ✅ Volle Ruby-Syntax
- ✅ Gem-Support via Package Manager
- ✅ Standard-Library verfügbar

**Ausführung:** `ruby script.rb`

---

#### 🐘 PHP
```php
<?php
// PHP Script Execution
class Calculator {
    public function add($a, $b) {
        return $a + $b;
    }
    
    public function multiply($a, $b) {
        return $a * $b;
    }
}

$calc = new Calculator();
echo "5 + 3 = " . $calc->add(5, 3) . "\n";
echo "5 * 3 = " . $calc->multiply(5, 3) . "\n";

$data = [
    'name' => 'OpenChat',
    'version' => '2.0',
    'features' => ['Canvas', 'Multi-Language', 'Package Manager']
];

echo json_encode($data, JSON_PRETTY_PRINT);
?>
```

**Features:**
- ✅ Volle PHP-Syntax
- ✅ Composer-Support via Package Manager
- ✅ Standard-Library verfügbar

**Ausführung:** `php script.php`

---

### Kompilierte Sprachen (Compile + Run)

#### 🦀 Rust
```rust
// Rust Program mit Kompilierung
fn main() {
    println!("🦀 Rust Execution!");
    
    // Ownership & Borrowing
    let numbers = vec![1, 2, 3, 4, 5];
    let sum: i32 = numbers.iter().sum();
    println!("Sum: {}", sum);
    
    // Pattern Matching
    match sum {
        15 => println!("Perfect sum!"),
        _ => println!("Sum is {}", sum)
    }
    
    // Iterators
    let doubled: Vec<i32> = numbers.iter().map(|x| x * 2).collect();
    println!("Doubled: {:?}", doubled);
}
```

**Features:**
- ✅ Automatische Kompilierung mit rustc
- ✅ Cargo-Support via Package Manager
- ✅ Volle Rust-Syntax (Ownership, Borrowing, etc.)
- ✅ Fehlerbehandlung bei Compile-Errors

**Ausführung:** 
1. `rustc script.rs -o script.exe`
2. `.\script.exe`

---

#### 🐹 Go
```go
// Go Program mit Kompilierung
package main

import (
    "fmt"
    "time"
)

type Person struct {
    Name string
    Age  int
}

func (p Person) Greet() {
    fmt.Printf("Hello, I'm %s and I'm %d years old\n", p.Name, p.Age)
}

func main() {
    fmt.Println("🐹 Go Execution!")
    
    // Structs
    person := Person{Name: "Alice", Age: 30}
    person.Greet()
    
    // Goroutines (simple example)
    done := make(chan bool)
    go func() {
        fmt.Println("Running in goroutine!")
        time.Sleep(100 * time.Millisecond)
        done <- true
    }()
    <-done
    
    // Slices
    numbers := []int{1, 2, 3, 4, 5}
    sum := 0
    for _, n := range numbers {
        sum += n
    }
    fmt.Printf("Sum: %d\n", sum)
}
```

**Features:**
- ✅ Automatische Kompilierung mit go run
- ✅ Go Modules Support
- ✅ Goroutines & Channels
- ✅ Volle Go-Syntax

**Ausführung:** `go run script.go`

---

#### ☕ Java
```java
// Java Program mit Kompilierung
public class Main {
    public static void main(String[] args) {
        System.out.println("☕ Java Execution!");
        
        // OOP
        Person person = new Person("Alice", 30);
        person.greet();
        
        // Arrays & Loops
        int[] numbers = {1, 2, 3, 4, 5};
        int sum = 0;
        for (int n : numbers) {
            sum += n;
        }
        System.out.println("Sum: " + sum);
        
        // Lambda Expressions (Java 8+)
        java.util.Arrays.stream(numbers)
            .map(n -> n * 2)
            .forEach(n -> System.out.print(n + " "));
    }
}

class Person {
    private String name;
    private int age;
    
    public Person(String name, int age) {
        this.name = name;
        this.age = age;
    }
    
    public void greet() {
        System.out.println("Hello, I'm " + name + " and I'm " + age + " years old");
    }
}
```

**Features:**
- ✅ Automatische Kompilierung mit javac
- ✅ Automatische Klassennamen-Erkennung
- ✅ Volle Java-Syntax (OOP, Lambdas, Streams)
- ✅ Fehlerbehandlung bei Compile-Errors

**Ausführung:**
1. `javac Main.java`
2. `java Main`

---

#### 🔧 C/C++
```cpp
// C++ Program mit Kompilierung
#include <iostream>
#include <vector>
#include <algorithm>

class Calculator {
public:
    int add(int a, int b) {
        return a + b;
    }
    
    int multiply(int a, int b) {
        return a * b;
    }
};

int main() {
    std::cout << "🔧 C++ Execution!" << std::endl;
    
    // OOP
    Calculator calc;
    std::cout << "5 + 3 = " << calc.add(5, 3) << std::endl;
    std::cout << "5 * 3 = " << calc.multiply(5, 3) << std::endl;
    
    // STL
    std::vector<int> numbers = {1, 2, 3, 4, 5};
    int sum = 0;
    for (int n : numbers) {
        sum += n;
    }
    std::cout << "Sum: " << sum << std::endl;
    
    // Algorithms
    std::for_each(numbers.begin(), numbers.end(), [](int n) {
        std::cout << n * 2 << " ";
    });
    std::cout << std::endl;
    
    return 0;
}
```

**Features:**
- ✅ Automatische Kompilierung mit g++/gcc
- ✅ C++11/14/17 Support
- ✅ STL & Templates
- ✅ Fehlerbehandlung bei Compile-Errors

**Ausführung:**
1. `g++ script.cpp -o script.exe`
2. `.\script.exe`

---

### Preview-Sprachen (Live-Vorschau)

#### 🌐 HTML/CSS/JavaScript
```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .card {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 10px;
            backdrop-filter: blur(10px);
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>OpenChat Canvas</h1>
        <p>Multi-file support with live preview!</p>
        <button onclick="alert('Hello!')">Click Me</button>
    </div>
    
    <script>
        console.log('JavaScript is running!');
        document.querySelector('h1').style.animation = 'pulse 2s infinite';
    </script>
</body>
</html>
```

**Features:**
- ✅ Live Preview mit Zoom (25%-200%)
- ✅ Dark/Light Mode Toggle
- ✅ Multi-File Support (HTML + CSS + JS)
- ✅ Automatische Datei-Injektion
- ✅ Sandbox-Modus (verhindert Navigation)

---

#### 📝 Markdown
```markdown
# OpenChat Canvas

## Features

- **Multi-Language Support**: 12+ Sprachen
- **Package Management**: Automatische Installation
- **Live Preview**: HTML, CSS, Markdown

### Code Beispiel

\`\`\`python
def hello():
    print("Hello from Markdown!")
\`\`\`

### Tabelle

| Sprache | Status |
|---------|--------|
| Python  | ✅     |
| Rust    | ✅     |
| Go      | ✅     |
```

**Features:**
- ✅ Live Markdown Preview
- ✅ Syntax Highlighting in Code Blocks
- ✅ Tabellen, Listen, Links
- ✅ Dark/Light Mode

---

#### 📋 JSON
```json
{
  "name": "OpenChat",
  "version": "2.0",
  "features": [
    "Canvas Mode",
    "Multi-Language",
    "Package Manager",
    "Live Preview"
  ],
  "languages": {
    "interpreted": ["Python", "JavaScript", "Ruby", "PHP"],
    "compiled": ["Rust", "Go", "Java", "C++"]
  },
  "stats": {
    "supported_languages": 12,
    "package_managers": 7
  }
}
```

**Features:**
- ✅ JSON Validation
- ✅ Pretty Printing
- ✅ Fehlerbehandlung mit Zeilennummer

---

## 🎯 Ausführungs-Workflow

### 1. Code schreiben
```
1. Sprache wird automatisch erkannt
2. Syntax Highlighting aktiviert
3. Code Editor bereit
```

### 2. Run Button klicken
```
Interpretierte Sprachen:
→ Direkte Ausführung
→ Output in Echtzeit

Kompilierte Sprachen:
→ Kompilierung
→ Bei Erfolg: Ausführung
→ Bei Fehler: Compile-Errors anzeigen

Preview-Sprachen:
→ Live Preview aktivieren
→ Zoom & Dark Mode verfügbar
```

### 3. Output analysieren
```
✓ Erfolg: Grünes Häkchen + Output
✗ Fehler: Rotes X + Fehlermeldung
⚠️ Warnung: Gelbes Dreieck + Warnung
```

## 🔧 Systemanforderungen

### Erforderliche Tools

| Sprache | Tool | Installation |
|---------|------|--------------|
| Python | python | [python.org](https://python.org) |
| JavaScript | Node.js (optional) | [nodejs.org](https://nodejs.org) |
| Ruby | ruby | [ruby-lang.org](https://www.ruby-lang.org) |
| Rust | rustc | [rustup.rs](https://rustup.rs) |
| Go | go | [go.dev](https://go.dev) |
| PHP | php | [php.net](https://www.php.net) |
| Java | JDK | [oracle.com/java](https://www.oracle.com/java/) |
| C/C++ | gcc/g++ | [mingw-w64.org](https://www.mingw-w64.org) |

### PATH-Konfiguration

Alle Tools müssen in der System-PATH verfügbar sein:

```bash
# Windows: Prüfen ob Tools verfügbar sind
python --version
ruby --version
rustc --version
go version
php --version
javac --version
gcc --version
```

## 🛠️ Fehlerbehebung

### Problem: "Command not found"

**Lösung:**
1. Tool installieren (siehe Systemanforderungen)
2. Zur PATH hinzufügen
3. Terminal neu starten
4. Canvas neu laden

### Problem: Kompilierung schlägt fehl

**Lösung:**
1. Syntax-Fehler im Code prüfen
2. Compiler-Version prüfen
3. Fehlermeldung lesen
4. Code korrigieren

### Problem: Package fehlt

**Lösung:**
1. Package Manager öffnen
2. Package installieren
3. Code erneut ausführen

## 💡 Best Practices

### 1. Sprach-spezifische Konventionen
```
✅ Python: PEP 8 Style Guide
✅ JavaScript: ESLint Rules
✅ Rust: rustfmt
✅ Go: gofmt
✅ Java: Oracle Code Conventions
```

### 2. Fehlerbehandlung
```
✅ Try-Catch Blöcke verwenden
✅ Aussagekräftige Fehlermeldungen
✅ Logging für Debugging
```

### 3. Performance
```
✅ Kleine, fokussierte Scripts
✅ Vermeidung von Endlosschleifen
✅ Ressourcen-Management
```

## 🎓 Beispiele

### Multi-Language Projekt

**1. Python Backend**
```python
# api.py
def get_data():
    return {"status": "success", "data": [1, 2, 3]}

print(get_data())
```

**2. JavaScript Frontend**
```javascript
// app.js
const data = { status: "success", data: [1, 2, 3] };
console.log(`Status: ${data.status}`);
console.log(`Data: ${data.data.join(', ')}`);
```

**3. HTML UI**
```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<body>
    <h1>Multi-Language Project</h1>
    <div id="output"></div>
    <script src="app.js"></script>
</body>
</html>
```

## 🚀 Zusammenfassung

Der Canvas-Editor bietet:
- ✅ 12+ Programmiersprachen
- ✅ Automatische Erkennung
- ✅ Kompilierung & Ausführung
- ✅ Live Preview
- ✅ Package Management
- ✅ Fehlerbehandlung
- ✅ Multi-File Support

Viel Erfolg beim Coden! 🎉
