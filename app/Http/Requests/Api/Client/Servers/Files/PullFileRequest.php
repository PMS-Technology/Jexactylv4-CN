<?php

namespace Everest\Http\Requests\Api\Client\Servers\Files;

use Everest\Models\Permission;
use Everest\Contracts\Http\ClientPermissionsRequest;
use Everest\Http\Requests\Api\Client\ClientApiRequest;

class PullFileRequest extends ClientApiRequest implements ClientPermissionsRequest
{
    public function permission(): string
    {
        return Permission::ACTION_FILE_CREATE;
    }

    public function rules(): array
    {
        return [
            // Laravel's bare `url` rule accepts any scheme it knows about (file, ftp,
            // gopher, ...), so the scheme is pinned down here. The daemon fetches this
            // URL on the node, and only HTTP(S) is ever a legitimate download source.
            'url' => 'required|string|url:http,https',
            'directory' => [
                'nullable',
                'string',
                'max:1024',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    // Wings maps this onto its own `root`; a parent reference would let a
                    // download land outside of the directory the user is browsing.
                    if (is_string($value) && preg_match('#(^|/)\.\.(/|$)#', $value) === 1) {
                        $fail('The :attribute must not contain parent directory references.');
                    }
                },
            ],
            'filename' => [
                'nullable',
                'string',
                'max:255',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    // Wings maps this onto its own `file_name`; it has to stay a plain
                    // name instead of a path.
                    if (is_string($value) && preg_match('#[\\\\/]#', $value) === 1) {
                        $fail('The :attribute must be a plain file name.');
                    }
                    if (is_string($value) && in_array($value, ['.', '..'], true)) {
                        $fail('The :attribute must be a plain file name.');
                    }
                },
            ],
            'use_header' => 'boolean',
            'foreground' => 'boolean',
        ];
    }
}
