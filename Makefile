# VoiceNav-AI Development Makefile
.PHONY: help install install-dev clean lint type-check test test-py test-js format build deploy destroy logs status

# Colors for output
RED=\033[0;31m
GREEN=\033[0;32m
YELLOW=\033[1;33m
BLUE=\033[0;34m
NC=\033[0m # No Color

# Default target
help: ## Show this help message
	@echo "$(BLUE)VoiceNav-AI Development Commands$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "$(GREEN)%-20s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Installation targets
install: ## Install production dependencies
	@echo "$(YELLOW)Installing production dependencies...$(NC)"
	pip install -r requirements.txt
	cd Client && npm install --production

install-dev: ## Install development dependencies
	@echo "$(YELLOW)Installing development dependencies...$(NC)"
	pip install -r requirements-dev.txt
	cd Client && npm install
	cd infrastructure && npm install
	pre-commit install

# Cleaning targets
clean: ## Clean build artifacts and cache files
	@echo "$(YELLOW)Cleaning build artifacts...$(NC)"
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -name ".coverage" -delete
	find . -name "coverage.xml" -delete
	rm -rf .pytest_cache/
	rm -rf .mypy_cache/
	cd Client && rm -rf node_modules/ dist/
	cd infrastructure && rm -rf node_modules/ cdk.out/

# Code quality targets
lint: ## Run linting on Python and JavaScript code
	@echo "$(YELLOW)Running Python linting...$(NC)"
	flake8 Src/ tests/ --max-line-length=88 --extend-ignore=E203,W503
	@echo "$(YELLOW)Running JavaScript linting...$(NC)"
	cd Client && npm run lint || echo "$(RED)JavaScript linting failed$(NC)"

type-check: ## Run type checking with mypy
	@echo "$(YELLOW)Running type checking...$(NC)"
	mypy Src/ --explicit-package-bases --ignore-missing-imports

format: ## Format code with black and prettier
	@echo "$(YELLOW)Formatting Python code...$(NC)"
	black Src/ tests/ --line-length=88
	@echo "$(YELLOW)Formatting JavaScript code...$(NC)"
	cd Client && npm run format || echo "$(RED)JavaScript formatting failed$(NC)"

# Testing targets
test: test-py test-js ## Run all tests

test-py: ## Run Python tests
	@echo "$(YELLOW)Running Python tests...$(NC)"
	pytest tests/ -v --cov=Src/ --cov-report=term-missing --cov-report=xml

test-js: ## Run JavaScript tests
	@echo "$(YELLOW)Running JavaScript tests...$(NC)"
	cd Client && npm test || echo "$(RED)No JavaScript tests configured$(NC)"

test-integration: ## Run integration tests
	@echo "$(YELLOW)Running integration tests...$(NC)"
	pytest tests/ -v -m integration || echo "$(RED)No integration tests found$(NC)"

# Build targets
build: ## Build client assets and Lambda packages
	@echo "$(YELLOW)Building client assets...$(NC)"
	cd Client && npm run build || echo "$(RED)Client build failed$(NC)"
	@echo "$(YELLOW)Creating Lambda deployment packages...$(NC)"
	$(MAKE) package-lambdas

package-lambdas: ## Package Lambda functions for deployment
	@echo "$(YELLOW)Packaging Lambda functions...$(NC)"
	cd Src/store-conn && zip -r ../../store-conn.zip . -x "*.pyc" "*__pycache__*"
	cd Src/transcribe-processor && zip -r ../../transcribe-processor.zip . -x "*.pyc" "*__pycache__*"
	cd Src/bedrock-processor && zip -r ../../bedrock-processor.zip . -x "*.pyc" "*__pycache__*"
	@echo "$(GREEN)Lambda packages created:$(NC)"
	@ls -la *.zip

# Development server targets
dev-client: ## Start development client server
	@echo "$(YELLOW)Starting client development server...$(NC)"
	cd Client && python -m http.server 8000

dev-docs: ## Serve documentation locally
	@echo "$(YELLOW)Starting documentation server...$(NC)"
	python -m http.server 3000

# AWS deployment targets
cdk-bootstrap: ## Bootstrap CDK for first-time deployment
	@echo "$(YELLOW)Bootstrapping CDK...$(NC)"
	cd infrastructure && cdk bootstrap

cdk-synth: ## Synthesize CDK templates
	@echo "$(YELLOW)Synthesizing CDK templates...$(NC)"
	cd infrastructure && cdk synth

cdk-diff: ## Show CDK deployment differences
	@echo "$(YELLOW)Showing CDK differences...$(NC)"
	cd infrastructure && cdk diff

deploy: cdk-synth ## Deploy infrastructure with CDK
	@echo "$(YELLOW)Deploying VoiceNav-AI infrastructure...$(NC)"
	cd infrastructure && cdk deploy --all --require-approval never

destroy: ## Destroy all AWS resources
	@echo "$(RED)WARNING: This will destroy all AWS resources!$(NC)"
	@read -p "Are you sure? (y/N) " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		cd infrastructure && cdk destroy --all --force; \
	else \
		echo "$(GREEN)Deployment destruction cancelled$(NC)"; \
	fi

# AWS operational targets
logs: ## Tail CloudWatch logs for all Lambda functions
	@echo "$(YELLOW)Tailing CloudWatch logs...$(NC)"
	aws logs tail /aws/lambda/VoiceNav-StoreConn --follow &
	aws logs tail /aws/lambda/VoiceNav-TranscribeProcessor --follow &
	aws logs tail /aws/lambda/VoiceNav-BedrockProcessor --follow &
	wait

logs-store: ## Tail logs for Store Connection Lambda
	aws logs tail /aws/lambda/VoiceNav-StoreConn --follow

logs-transcribe: ## Tail logs for Transcribe Processor Lambda
	aws logs tail /aws/lambda/VoiceNav-TranscribeProcessor --follow

logs-bedrock: ## Tail logs for Bedrock Processor Lambda
	aws logs tail /aws/lambda/VoiceNav-BedrockProcessor --follow

status: ## Check AWS resource status
	@echo "$(YELLOW)Checking AWS resource status...$(NC)"
	@echo "$(BLUE)Lambda Functions:$(NC)"
	aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `VoiceNav`)].{Name:FunctionName,Runtime:Runtime,Status:State}' --output table
	@echo "$(BLUE)S3 Buckets:$(NC)"
	aws s3 ls | grep voicenav || echo "No VoiceNav buckets found"
	@echo "$(BLUE)DynamoDB Tables:$(NC)"
	aws dynamodb list-tables --query 'TableNames[?contains(@, `VoiceNav`)]' --output table

# Security and maintenance targets
security-scan: ## Run security scans on dependencies
	@echo "$(YELLOW)Running Python security scan...$(NC)"
	safety check -r requirements.txt
	@echo "$(YELLOW)Running JavaScript security scan...$(NC)"
	cd Client && npm audit --audit-level=high

update-deps: ## Update all dependencies
	@echo "$(YELLOW)Updating Python dependencies...$(NC)"
	pip-review --local --auto
	@echo "$(YELLOW)Updating JavaScript dependencies...$(NC)"
	cd Client && npm update
	cd infrastructure && npm update

pre-commit: ## Run pre-commit hooks manually
	@echo "$(YELLOW)Running pre-commit hooks...$(NC)"
	pre-commit run --all-files

# Development workflow targets
setup: install-dev ## Complete development setup
	@echo "$(GREEN)Development environment setup complete!$(NC)"
	@echo "$(BLUE)Next steps:$(NC)"
	@echo "1. Copy and configure: cp Client/config.example.js Client/config.js"
	@echo "2. Run tests: make test"
	@echo "3. Start development: make dev-client"

check: clean lint type-check test ## Run all code quality checks

ci: check security-scan ## Run all CI checks

release: check build ## Prepare for release
	@echo "$(GREEN)Release preparation complete!$(NC)"
	@echo "$(BLUE)Ready to:$(NC)"
	@echo "1. Deploy: make deploy"
	@echo "2. Create git tag and push"

# Local testing targets
test-local: ## Test Lambda functions locally with sample events
	@echo "$(YELLOW)Testing Lambda functions locally...$(NC)"
	cd Src/store-conn && python -c "import app; print(app.lambda_handler({'requestContext': {'connectionId': 'test', 'eventType': 'CONNECT'}}, None))"

validate-config: ## Validate configuration files
	@echo "$(YELLOW)Validating configuration...$(NC)"
	@if [ -f "Client/config.js" ]; then \
		echo "$(GREEN)Client config found$(NC)"; \
	else \
		echo "$(RED)Client config missing. Run: cp Client/config.example.js Client/config.js$(NC)"; \
	fi

# Documentation targets
docs: ## Generate and serve documentation
	@echo "$(YELLOW)Generating documentation...$(NC)"
	@echo "$(BLUE)Documentation available at:$(NC)"
	@echo "- README: $(PWD)/README.md"
	@echo "- API Docs: $(PWD)/docs/API.md"
	@echo "- Deployment: $(PWD)/docs/DEPLOYMENT.md"
	@echo "- Security: $(PWD)/SECURITY.md"

# Quick development commands
quick-test: lint type-check test-py ## Quick test run (no JS dependencies)

quick-deploy: cdk-synth deploy ## Quick deployment without full checks
