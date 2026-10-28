<?php

namespace App\Libraries;

/**
 * IP / CIDR 白名單比對（IPv4、IPv6）
 *
 * 白名單格式：以逗號或空白/換行分隔，例如
 *   203.0.113.10
 *   10.0.0.0/8
 *   2001:db8::/32
 */
final class IpAllowlist
{
    /**
     * @return list<string>
     */
    public static function entries(string $raw): array
    {
        $parts = preg_split('/[\s,]+/', trim($raw)) ?: [];

        return array_values(array_filter($parts, static fn (string $part): bool => $part !== ''));
    }

    /**
     * 回傳格式錯誤的項目；空陣列代表全部合法。
     *
     * @return list<string>
     */
    public static function invalidEntries(string $raw): array
    {
        $invalid = [];

        foreach (self::entries($raw) as $entry) {
            if (! self::isValidEntry($entry)) {
                $invalid[] = $entry;
            }
        }

        return $invalid;
    }

    public static function isValidEntry(string $entry): bool
    {
        $pieces = explode('/', $entry);

        if (count($pieces) > 2 || $pieces[0] === '') {
            return false;
        }

        $packed = @inet_pton($pieces[0]);

        if ($packed === false) {
            return false;
        }

        if (count($pieces) === 1) {
            return true;
        }

        if ($pieces[1] === '' || ! ctype_digit($pieces[1])) {
            return false;
        }

        return (int) $pieces[1] <= strlen($packed) * 8;
    }

    /**
     * 判斷 IP 是否符合白名單任一項目。
     */
    public static function matches(string $ip, string $raw): bool
    {
        $ipPacked = @inet_pton($ip);

        if ($ipPacked === false) {
            return false;
        }

        foreach (self::entries($raw) as $entry) {
            if (self::entryMatches($ipPacked, $entry)) {
                return true;
            }
        }

        return false;
    }

    private static function entryMatches(string $ipPacked, string $entry): bool
    {
        $pieces = explode('/', $entry, 2);
        $netPacked = @inet_pton($pieces[0]);

        if ($netPacked === false || strlen($netPacked) !== strlen($ipPacked)) {
            return false;
        }

        if (count($pieces) === 1) {
            return $netPacked === $ipPacked;
        }

        if (! ctype_digit($pieces[1])) {
            return false;
        }

        $bits = (int) $pieces[1];

        if ($bits > strlen($netPacked) * 8) {
            return false;
        }

        $wholeBytes = intdiv($bits, 8);
        $remainingBits = $bits % 8;

        if ($wholeBytes > 0 && substr($ipPacked, 0, $wholeBytes) !== substr($netPacked, 0, $wholeBytes)) {
            return false;
        }

        if ($remainingBits === 0) {
            return true;
        }

        $mask = (0xFF << (8 - $remainingBits)) & 0xFF;

        return (ord($ipPacked[$wholeBytes]) & $mask) === (ord($netPacked[$wholeBytes]) & $mask);
    }
}
