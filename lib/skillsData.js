export const getSkillCategories = (t) => ({
    physical: {
        name: `1. ${t('physicalSkills')}`,
        folderName: '1. Physical Skills (Motor Development)',
        skills: [
            { id: 'skill_1', name: t('grossMotor'), image: '/1. Physical Skills (Motor Development)/gross-motor.jpg' },
            { id: 'skill_2', name: t('fineMotor'), image: '/1. Physical Skills (Motor Development)/fine-motor.jpg' },
            { id: 'skill_3', name: t('balanceCoordination'), image: '/1. Physical Skills (Motor Development)/balance.jpg' },
            { id: 'skill_4', name: t('runningJumping'), image: '/1. Physical Skills (Motor Development)/running.jpg' },
            { id: 'skill_5', name: t('handEyeCoordination'), image: '/1. Physical Skills (Motor Development)/hand-eye.jpg' }
        ]
    },
    cognitive: {
        name: `2. ${t('cognitiveSkills')}`,
        folderName: '2. Cognitive Skills',
        skills: [
            { id: 'skill_6', name: t('memoryRecall'), image: '/2. Cognitive Skills/memory.jpg' },
            { id: 'skill_7', name: t('problemSolving'), image: '/2. Cognitive Skills/problem-solving.jpg' },
            { id: 'skill_8', name: t('logicalThinking'), image: '/2. Cognitive Skills/logic.jpg' },
            { id: 'skill_9', name: t('attentionFocus'), image: '/2. Cognitive Skills/focus.jpg' },
            { id: 'skill_10', name: t('mathConcepts'), image: '/2. Cognitive Skills/math.jpg' }
        ]
    },
    language: {
        name: `3. ${t('languageSkills')}`,
        folderName: '3. Language & Communication',
        skills: [
            { id: 'skill_11', name: t('verbalCommunication'), image: '/3. Language & Communication/speaking.jpg' },
            { id: 'skill_12', name: t('readingSkills'), image: '/3. Language & Communication/reading.jpg' },
            { id: 'skill_13', name: t('writingSkills'), image: '/3. Language & Communication/writing.jpg' },
            { id: 'skill_14', name: t('listeningSkills'), image: '/3. Language & Communication/listening.jpg' },
            { id: 'skill_15', name: t('vocabularyDevelopment'), image: '/3. Language & Communication/vocabulary.jpg' }
        ]
    },
    social: {
        name: `4. ${t('socialSkills')}`,
        folderName: '4. Social and Emotional Skills',
        skills: [
            { id: 'skill_16', name: t('sharingCooperation'), image: '/4. Social and Emotional Skills/sharing.jpg' },
            { id: 'skill_17', name: t('empathyUnderstanding'), image: '/4. Social and Emotional Skills/empathy.jpg' },
            { id: 'skill_18', name: t('emotionRegulation'), image: '/4. Social and Emotional Skills/emotions.jpg' },
            { id: 'skill_19', name: t('makingFriends'), image: '/4. Social and Emotional Skills/friendship.jpg' },
            { id: 'skill_20', name: t('conflictResolution'), image: '/4. Social and Emotional Skills/conflict.jpg' }
        ]
    },
    selfcare: {
        name: `5. ${t('selfCareSkills')}`,
        folderName: '5. Self-Care & Independence',
        skills: [
            { id: 'skill_21', name: t('personalHygiene'), image: '/5. Self-Care & Independence/hygiene.jpg' },
            { id: 'skill_22', name: t('dressingCare'), image: '/5. Self-Care & Independence/dressing.jpg' },
            { id: 'skill_23', name: t('independentEating'), image: '/5. Self-Care & Independence/eating.jpg' },
            { id: 'skill_24', name: t('timeManagement'), image: '/5. Self-Care & Independence/time.jpg' },
            { id: 'skill_25', name: t('responsibilityChores'), image: '/5. Self-Care & Independence/chores.jpg' }
        ]
    },
    creative: {
        name: `6. ${t('creativeSkills')}`,
        folderName: '6. Creative & Expressive Skills',
        skills: [
            { id: 'skill_26', name: t('drawingPainting'), image: '/6. Creative & Expressive Skills/art.jpg' },
            { id: 'skill_27', name: t('musicRhythm'), image: '/6. Creative & Expressive Skills/music.jpg' },
            { id: 'skill_28', name: t('danceMovement'), image: '/6. Creative & Expressive Skills/dance.jpg' },
            { id: 'skill_29', name: t('imaginativePlay'), image: '/6. Creative & Expressive Skills/imagination.jpg' },
            { id: 'skill_30', name: t('storytelling'), image: '/6. Creative & Expressive Skills/storytelling.jpg' }
        ]
    },
    digital: {
        name: `7. ${t('digitalSkills')}`,
        folderName: '7. Digital & Modern Skills',
        skills: [
            { id: 'skill_31', name: t('basicComputer'), image: '/7. Digital & Modern Skills/computer.jpg' },
            { id: 'skill_32', name: t('digitalSafety'), image: '/7. Digital & Modern Skills/safety.jpg' },
            { id: 'skill_33', name: t('educationalApps'), image: '/7. Digital & Modern Skills/apps.jpg' },
            { id: 'skill_34', name: t('technologyAwareness'), image: '/7. Digital & Modern Skills/technology.jpg' },
            { id: 'skill_35', name: t('onlineLearning'), image: '/7. Digital & Modern Skills/online.jpg' }
        ]
    }
});
