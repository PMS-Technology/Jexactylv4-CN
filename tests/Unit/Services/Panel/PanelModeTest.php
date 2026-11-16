<?php

namespace Everest\Tests\Unit\Services\Panel;

use Mockery as m;
use PHPUnit\Framework\TestCase;
use Everest\Services\Panel\PanelMode;
use Everest\Contracts\Repository\SettingsRepositoryInterface;
use Illuminate\Contracts\Config\Repository as ConfigRepository;

class PanelModeTest extends TestCase
{
    /**
     * Build the service with a mocked settings repository and config repository.
     */
    private function service(?string $stored, string $configured = 'standard'): PanelMode
    {
        $settings = m::mock(SettingsRepositoryInterface::class);
        $settings->shouldReceive('get')
            ->with('settings::app:mode', m::any())
            ->andReturn($stored);

        $config = m::mock(ConfigRepository::class);
        $config->shouldReceive('get')
            ->with('app.mode', m::any())
            ->andReturn($configured);

        return new PanelMode($settings, $config);
    }

    /**
     * Test that the stored mode is used when it is a known mode.
     */
    public function testStoredModeIsUsed()
    {
        $this->assertSame(PanelMode::PERSONAL, $this->service('personal')->current());
        $this->assertTrue($this->service('personal')->isPersonal());
        $this->assertFalse($this->service('personal')->isStandard());
    }

    /**
     * Test that the config value is the fallback when nothing was stored yet.
     */
    public function testConfigIsUsedAsFallback()
    {
        $this->assertSame(PanelMode::STANDARD, $this->service(null)->current());
        $this->assertSame(PanelMode::PERSONAL, $this->service(null, 'personal')->current());
    }

    /**
     * Test that an unknown stored value falls back to standard mode.
     */
    public function testUnknownModeFallsBackToStandard()
    {
        $this->assertSame(PanelMode::STANDARD, $this->service('something-else')->current());
        $this->assertSame(PanelMode::STANDARD, $this->service('')->current());
    }

    /**
     * Test that the standard only features are unavailable in personal mode.
     */
    public function testStandardOnlyFeatures()
    {
        $personal = $this->service('personal');
        $standard = $this->service('standard');

        foreach (PanelMode::STANDARD_ONLY as $feature) {
            $this->assertFalse($personal->allows($feature));
            $this->assertTrue($standard->allows($feature));
        }

        // Features that are not mode dependent stay available.
        $this->assertTrue($personal->allows('nodes'));
    }
}
