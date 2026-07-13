# Gera os 75 arquivos de voz das bolas (B1..O75) usando a voz pt-BR nativa do
# Windows (SAPI / System.Speech) - sem custo, sem API externa, 100% local.
# Formato de saída: WAV (não MP3 - este ambiente não tem encoder MP3 disponível;
# o navegador reproduz .wav de forma idêntica).

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech

$outDir = Join-Path $PSScriptRoot '..\client\public\audio\balls'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$ptBrVoice = $synth.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -eq 'pt-BR' } | Select-Object -First 1
if ($ptBrVoice) {
  $synth.SelectVoice($ptBrVoice.VoiceInfo.Name)
} else {
  Write-Warning 'Nenhuma voz pt-BR instalada foi encontrada; usando a voz padrão do sistema.'
}
$synth.Rate = -1

function Get-ColumnLetter([int]$n) {
  if ($n -le 15) { return 'b' }
  elseif ($n -le 30) { return 'i' }
  elseif ($n -le 45) { return 'n' }
  elseif ($n -le 60) { return 'g' }
  else { return 'o' }
}

for ($n = 1; $n -le 75; $n++) {
  $letter = Get-ColumnLetter $n
  $path = Join-Path $outDir "$letter-$n.wav"

  $builder = New-Object System.Speech.Synthesis.PromptBuilder
  $builder.Culture = [System.Globalization.CultureInfo]::GetCultureInfo('pt-BR')
  $builder.AppendText($letter.ToUpper())
  $builder.AppendBreak([System.Speech.Synthesis.PromptBreak]::Small)
  $builder.AppendTextWithHint("$n", [System.Speech.Synthesis.SayAs]::NumberCardinal)

  $synth.SetOutputToWaveFile($path)
  $synth.Speak($builder)
  $synth.SetOutputToNull()

  if ($n % 15 -eq 0) { Write-Host "Gerado até $n/75..." }
}

Write-Host "Concluído: 75 arquivos de voz gerados em $outDir"
