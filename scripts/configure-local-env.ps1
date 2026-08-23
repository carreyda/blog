$ErrorActionPreference = 'Stop'

$workspaceRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$envPath = Join-Path $workspaceRoot '.env'
$securePassword = Read-Host 'Enter the password for blog_app' -AsSecureString
$passwordPointer = [IntPtr]::Zero
$plainPassword = $null

try {
  $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
  $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)

  if ([string]::IsNullOrWhiteSpace($plainPassword)) {
    throw 'The database password cannot be empty.'
  }

  $encodedPassword = [Uri]::EscapeDataString($plainPassword)
  $sessionBytes = New-Object byte[] 48
  $randomGenerator = [Security.Cryptography.RandomNumberGenerator]::Create()

  try {
    $randomGenerator.GetBytes($sessionBytes)
  }
  finally {
    $randomGenerator.Dispose()
  }

  $sessionSecret = [Convert]::ToBase64String($sessionBytes)
  $databaseUrl = 'postgresql://blog_app:{0}@127.0.0.1:5432/blog_dev?schema=public' -f $encodedPassword
  $content = @(
    'DATABASE_URL="{0}"' -f $databaseUrl
    'SESSION_SECRET="{0}"' -f $sessionSecret
    'NUXT_PUBLIC_SITE_URL="http://localhost:3000"'
  ) -join [Environment]::NewLine

  [System.IO.File]::WriteAllText(
    $envPath,
    $content + [Environment]::NewLine,
    (New-Object System.Text.UTF8Encoding($false))
  )

  Write-Host ('Created {0}' -f $envPath)
}
finally {
  if ($passwordPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  }
  $plainPassword = $null
}
