#!/usr/bin/env python3
"""
Validate VoiceNav-AI Python package structure
"""

import ast
import os
import sys
from pathlib import Path

def validate_python_syntax(file_path):
    """Check if a Python file has valid syntax."""
    try:
        with open(file_path, 'r') as f:
            ast.parse(f.read())
        return True, None
    except SyntaxError as e:
        return False, str(e)
    except Exception as e:
        return False, str(e)

def main():
    """Main validation function."""
    src_dir = Path("Src")
    
    if not src_dir.exists():
        print("❌ Src/ directory not found")
        return False
    
    # Expected Lambda packages
    lambda_packages = ["store_conn", "transcribe_processor", "bedrock_processor"]
    
    print("🔍 Validating VoiceNav-AI Python structure...")
    print()
    
    success = True
    
    # Check each Lambda package
    for package in lambda_packages:
        package_dir = src_dir / package
        print(f"📦 Checking {package}/")
        
        # Check if package directory exists
        if not package_dir.exists():
            print(f"   ❌ Directory not found")
            success = False
            continue
            
        # Check for __init__.py
        init_file = package_dir / "__init__.py"
        if not init_file.exists():
            print(f"   ❌ __init__.py missing")
            success = False
        else:
            print(f"   ✅ __init__.py found")
            
        # Check for app.py
        app_file = package_dir / "app.py"
        if not app_file.exists():
            print(f"   ❌ app.py missing")
            success = False
        else:
            # Validate syntax
            valid, error = validate_python_syntax(app_file)
            if valid:
                print(f"   ✅ app.py syntax valid")
            else:
                print(f"   ❌ app.py syntax error: {error}")
                success = False
                
        # Check for requirements.txt
        req_file = package_dir / "requirements.txt"
        if req_file.exists():
            print(f"   ✅ requirements.txt found")
        else:
            print(f"   ⚠️  requirements.txt missing (optional)")
            
        print()
    
    # Check main Src __init__.py
    main_init = src_dir / "__init__.py"
    if main_init.exists():
        print("✅ Main Src/__init__.py found")
    else:
        print("❌ Main Src/__init__.py missing")
        success = False
    
    print()
    if success:
        print("🎉 All validations passed! Python package structure is correct.")
        print("   You can now run: mypy Src/ --explicit-package-bases --ignore-missing-imports")
    else:
        print("❌ Some validations failed. Please fix the issues above.")
        
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
