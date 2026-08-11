Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class CredManager8 {
    [DllImport("advapi32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CredRead(string target, int type, int reservedFlag, out IntPtr credential);
    [DllImport("advapi32.dll")]
    public static extern void CredFree(IntPtr buffer);

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public int Flags;
        public int Type;
        public string TargetName;
        public string Comment;
        public long LastWritten;
        public int CredentialBlobSize;
        public IntPtr CredentialBlob;
        public int Persist;
        public int AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }

    public static string GetCredential(string target) {
        IntPtr credPtr;
        if (CredRead(target, 1, 0, out credPtr)) {
            var cred = (CREDENTIAL)Marshal.PtrToStructure(credPtr, typeof(CREDENTIAL));
            byte[] bytes = new byte[cred.CredentialBlobSize];
            Marshal.Copy(cred.CredentialBlob, bytes, 0, cred.CredentialBlobSize);
            CredFree(credPtr);
            return System.Text.Encoding.UTF8.GetString(bytes);
        }
        return null;
    }
}
"@

$token = [CredManager8]::GetCredential("Supabase CLI:supabase")
$headers = @{ "Authorization" = "Bearer $token" }
$response = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/irxgmhxhmxtzfwuieblc/api-keys" -Headers $headers
$serviceRole = $response | Where-Object { $_.name -eq "service_role" }
Write-Output $serviceRole.api_key
