# Contributing to VoiceNav-AI

We love your input! We want to make contributing to VoiceNav-AI as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

## Pull Requests

Pull requests are the best way to propose changes to the codebase. We actively welcome your pull requests:

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Any contributions you make will be under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](http://choosealicense.com/licenses/mit/) that covers the project. Feel free to contact the maintainers if that's a concern.

## Report bugs using GitHub's [issue tracker](https://github.com/oyiz-michael/VoiceNav-AI/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/oyiz-michael/VoiceNav-AI/issues/new); it's that easy!

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Development Setup

1. **Clone your fork**:
   ```bash
   git clone https://github.com/your-username/VoiceNav-AI.git
   cd VoiceNav-AI
   ```

2. **Set up Python environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements-dev.txt
   ```

3. **Set up pre-commit hooks**:
   ```bash
   pre-commit install
   ```

4. **Run tests**:
   ```bash
   pytest
   ```

## Coding Standards

- **Python**: Follow PEP 8, use Black for formatting
- **JavaScript**: Use ES6+, follow Standard JS style
- **Comments**: Write clear, concise comments
- **Documentation**: Update docs for any API changes

## Testing

- Write unit tests for all new functionality
- Ensure all tests pass before submitting PR
- Add integration tests for new features
- Test cross-browser compatibility for frontend changes

## Code Review Process

- All submissions require review before merging
- Maintainers will review your PR as soon as possible
- Address feedback promptly
- Keep PRs focused and small when possible

## Getting Help

- Join our [Discussions](https://github.com/oyiz-michael/VoiceNav-AI/discussions)
- Check the [documentation](docs/)
- Open an [issue](https://github.com/oyiz-michael/VoiceNav-AI/issues) for questions

## Recognition

Contributors will be recognized in our README and release notes. Thank you for making VoiceNav-AI better! 🎉
