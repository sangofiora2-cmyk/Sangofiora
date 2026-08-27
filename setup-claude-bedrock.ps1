<#
.SYNOPSIS
    Configures Claude Code CLI to use AWS Bedrock.
.DESCRIPTION
    Sets user-level environment variables for Claude Code AWS Bedrock integration.
#>

param(
    [Parameter(Mandatory=$false)]
    [string]$AccessKey,

    [Parameter(Mandatory=$false)]
    [string]$SecretKey,

    [Parameter(Mandatory=$false)]
    [string]$Region = "us-east-1"
)

if (-not $AccessKey -or -not $SecretKey) {
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "       Claude Code AWS Bedrock Configuration Setup         " -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Please provide your AWS credentials to complete setup." -ForegroundColor Yellow
    Write-Host ""
    
    $AccessKey = Read-Host "Enter AWS_ACCESS_KEY_ID"
    $SecretKey = Read-Host "Enter AWS_SECRET_ACCESS_KEY"
    $InputRegion = Read-Host "Enter AWS_REGION [default: us-east-1]"
    
    if ($InputRegion -and $InputRegion.Trim() -ne "") {
        $Region = $InputRegion.Trim()
    }
}

if (-not $AccessKey -or -not $SecretKey) {
    Write-Host "Error: Access Key and Secret Key are required." -ForegroundColor Red
    exit 1
}

[System.Environment]::SetEnvironmentVariable("CLAUDE_CODE_USE_BEDROCK", "1", "User")
[System.Environment]::SetEnvironmentVariable("AWS_REGION", $Region, "User")
[System.Environment]::SetEnvironmentVariable("AWS_ACCESS_KEY_ID", $AccessKey.Trim(), "User")
[System.Environment]::SetEnvironmentVariable("AWS_SECRET_ACCESS_KEY", $SecretKey.Trim(), "User")

# Set current process env variables as well
$env:CLAUDE_CODE_USE_BEDROCK = "1"
$env:AWS_REGION = $Region
$env:AWS_ACCESS_KEY_ID = $AccessKey.Trim()
$env:AWS_SECRET_ACCESS_KEY = $SecretKey.Trim()

Write-Host ""
Write-Host "✅ AWS Bedrock configuration for Claude Code successfully saved!" -ForegroundColor Green
Write-Host "Region: $Region" -ForegroundColor White
Write-Host "Bedrock Enabled: 1" -ForegroundColor White
Write-Host ""
Write-Host "You can now run 'claude' in PowerShell or Command Prompt." -ForegroundColor Cyan
