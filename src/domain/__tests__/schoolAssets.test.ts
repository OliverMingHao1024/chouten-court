import { describe, expect, it } from 'vitest'
import {
  evaluateSchoolAssetUnlocks,
  hasSchoolAsset,
  newlyUnlockedAssets,
  SCHOOL_ASSET_REPUTATION_THRESHOLD,
} from '../schoolAssets'

describe('evaluateSchoolAssetUnlocks', () => {
  it('unlocks nothing below every threshold', () => {
    expect(evaluateSchoolAssetUnlocks([], 0)).toEqual([])
  })

  it('unlocks scoutingNetwork once reputation reaches its threshold', () => {
    const threshold = SCHOOL_ASSET_REPUTATION_THRESHOLD.scoutingNetwork
    expect(evaluateSchoolAssetUnlocks([], threshold - 1)).not.toContain('scoutingNetwork')
    expect(evaluateSchoolAssetUnlocks([], threshold)).toContain('scoutingNetwork')
  })

  it('unlocks both assets once reputation clears the higher threshold', () => {
    const threshold = SCHOOL_ASSET_REPUTATION_THRESHOLD.videoAnalysis
    const unlocked = evaluateSchoolAssetUnlocks([], threshold)
    expect(unlocked).toContain('scoutingNetwork')
    expect(unlocked).toContain('videoAnalysis')
  })

  it('never removes an already-unlocked asset even if reputation drops back down', () => {
    const unlocked = evaluateSchoolAssetUnlocks(['scoutingNetwork'], 0)
    expect(unlocked).toContain('scoutingNetwork')
  })

  it('unlocks trainingFacility, recoveryCenter, and coachSpecialization at their own thresholds', () => {
    expect(evaluateSchoolAssetUnlocks([], SCHOOL_ASSET_REPUTATION_THRESHOLD.trainingFacility)).toContain(
      'trainingFacility',
    )
    expect(evaluateSchoolAssetUnlocks([], SCHOOL_ASSET_REPUTATION_THRESHOLD.recoveryCenter)).toContain(
      'recoveryCenter',
    )
    expect(evaluateSchoolAssetUnlocks([], SCHOOL_ASSET_REPUTATION_THRESHOLD.coachSpecialization)).toContain(
      'coachSpecialization',
    )
  })
})

describe('hasSchoolAsset', () => {
  it('reflects whether the key is present', () => {
    expect(hasSchoolAsset(['scoutingNetwork'], 'scoutingNetwork')).toBe(true)
    expect(hasSchoolAsset(['scoutingNetwork'], 'videoAnalysis')).toBe(false)
  })
})

describe('newlyUnlockedAssets', () => {
  it('returns only assets present in next but not previous', () => {
    expect(newlyUnlockedAssets([], ['scoutingNetwork'])).toEqual(['scoutingNetwork'])
    expect(newlyUnlockedAssets(['scoutingNetwork'], ['scoutingNetwork', 'videoAnalysis'])).toEqual(['videoAnalysis'])
  })

  it('returns an empty array when nothing changed', () => {
    expect(newlyUnlockedAssets(['scoutingNetwork'], ['scoutingNetwork'])).toEqual([])
  })
})
