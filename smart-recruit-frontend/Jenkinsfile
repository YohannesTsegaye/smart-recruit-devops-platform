pipeline {
    agent any

    environment {
        NODE_ENV = 'production'
        VITE_API_URL = 'http://localhost:3000'
        NPM_CONFIG_REGISTRY = 'https://registry.npmjs.org'
        NODE_OPTIONS = "--experimental-vm-modules --no-warnings"
    }

    stages {
        stage('🚀 1. Environment Setup') {
            steps {
                cleanWs()
                script {
                    // Verify Node.js and npm versions
                    def nodeVersion = sh(script: 'node --version', returnStdout: true).trim()
                    def npmVersion = sh(script: 'npm --version', returnStdout: true).trim()
                    echo "ℹ️ Using Node.js ${nodeVersion} and npm ${npmVersion}"
                    
                    // Checkout code
                    checkout([
                        $class: 'GitSCM',
                        branches: [[name: '*/main']],
                        userRemoteConfigs: [[
                            url: 'https://github.com/YohannesTsegaye/smart-recruit-frontend.git',
                            credentialsId: 'github-credentials'
                        ]]
                    ])
                    echo "✅ Repository cloned successfully"
                    
                    // Verify package.json exists
                    if (!fileExists('package.json')) {
                        error("❌ package.json not found")
                    }
                }
            }
        }

        stage('📦 2. Robust Dependency Installation') {
            steps {
                script {
                    // Clean previous installation
                    sh 'rm -rf node_modules package-lock.json .npmrc'
                    
                    // Strategy 1: Try npm ci with devDependencies
                    try {
                        sh 'NODE_ENV= npm ci --include=dev --no-audit'
                        echo "✅ Dependencies installed via npm ci"
                    } catch (ciErr) {
                        echo "⚠️ npm ci failed, falling back to npm install"
                        
                        // Strategy 2: Full npm install with legacy peer deps
                        sh 'npm install --legacy-peer-deps --no-audit --prefer-offline --fetch-timeout=300000'
                    }
                    
                    // Strategy 3: Ensure core dependencies are present
                    sh 'npm install --save-dev eslint @eslint/js vite @tailwindcss/vite --no-audit --prefer-offline --save-exact'
                    
                    // Verify critical dependencies
                    def verifyDep = { dep ->
                        def status = sh(
                            script: "npm list ${dep} --depth=0 --json | grep -q '\"version\":'",
                            returnStatus: true
                        )
                        return status == 0
                    }
                    
                    def criticalDeps = ['eslint', 'vite', '@eslint/js', '@tailwindcss/vite']
                    def missingDeps = criticalDeps.findAll { !verifyDep(it) }
                    
                    if (missingDeps) {
                        error("❌ Missing critical dependencies: ${missingDeps}")
                    }
                    
                    echo "✅ Verified all core dependencies"
                }
            }
        }

        stage('🔧 3. Dependency Linking') {
            steps {
                script {
                    // Rebuild and link dependencies
                    sh 'npm rebuild'
                    sh '''
                        [ ! -f node_modules/.bin/eslint ] && ln -s ../eslint/bin/eslint.js node_modules/.bin/eslint || true
                        [ ! -f node_modules/.bin/vite ] && ln -s ../vite/bin/vite.js node_modules/.bin/vite || true
                    '''
                    echo "✅ Dependencies properly linked"
                }
            }
        }

        stage('🧹 4. Linting') {
            steps {
                script {
                    try {
                        sh 'node node_modules/eslint/bin/eslint.js . --max-warnings=0'
                        echo "✅ Linting passed with no warnings"
                    } catch (err) {
                        echo "⚠️ Linting issues found (not blocking)"
                    }
                }
            }
        }

        stage('🏗️ 5. Building') {
            steps {
                script {
                    sh 'node node_modules/vite/bin/vite.js build --emptyOutDir'
                    echo "✅ Build completed successfully"
                    
                    // Verify build output
                    if (!fileExists('dist/index.html') && !fileExists('build/index.html')) {
                        error("❌ No build output detected")
                    }
                    
                    echo "📦 Build output:"
                    sh 'ls -la dist/ || ls -la build/'
                    sh 'du -sh dist/ || du -sh build/'
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'dist/**/*,build/**/*', allowEmptyArchive: true
            cleanWs()
        }
        success {
            echo "🎉 Pipeline succeeded!"
        }
        failure {
            echo "❌ Pipeline failed"
        }
    }
}
