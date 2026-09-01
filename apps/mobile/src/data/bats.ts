import { Bat } from "@components/BatItem";



export const bats: Bat[] = [

    // Pipistrelle
    {
        id: "common",
        species: "Common Pipistrelle",
        abr: "CP",
        group: "Pipistrelle",
        frequencyRange: "42-48 kHz",
        info: "Peak ~45 kHz. Fast, erratic flight at low-medium height. Rapid, dry clicks. Common around buildings, gardens, hedgerows and woodland edges. Distinguish from Soprano Pipistrelle by lower peak frequency.",
        image: require("@assets/images/bats/soprano.jpg")
    },

    {
        id: "soprano",
        species: "Soprano Pipistrelle",
        abr: "SP",
        group: "Pipistrelle",
        frequencyRange: "52-60 kHz",
        info: "Peak ~55 kHz. Fast, erratic flight, often low-medium height. Similar call rhythm to Common Pipistrelle but noticeably higher frequency. Frequently recorded around water, woodland edges, gardens and buildings.",
        image: require("@assets/images/bats/soprano.jpg")
    },

    {
        id: "narthuseus",
        species: "Nathusius Pipistrelle",
        abr: "NP",
        group: "Pipistrelle",
        frequencyRange: "30-45 kHz",
        info: "Peak ~38 kHz. Larger than Common and Soprano Pipistrelles. Fast flight, often around water, woodland edges and open areas. Lower-frequency call than Common Pipistrelle.",
        image: require("@assets/images/bats/narthuseus.jpg")
    },

    // Myotis
    {
        id: "daubenton",
        species: "Daubentons",
        abr: "Daub (M)",
        group: "Myotis",
        frequencyRange: "35-85 kHz",
        info: "Typically peaks ~45-50 kHz. Usually flies very low over water, often appearing to skim the surface. Rapid, regular 'machine-gun' rhythm. Strong association with rivers, lakes and canals.",
        image: require("@assets/images/bats/daubenton.jpg")
    },

    {
        id: "natterers",
        species: "Natterers",
        abr: "Nat (M)",
        group: "Myotis",
        frequencyRange: "35-80 kHz",
        info: "Broadband calls typically peaking around ~50 kHz. Quiet, irregular and often difficult to detect. Agile flight, often close to vegetation. Look for woodland, parkland, farmland and water-edge habitat.",
        image: require("@assets/images/bats/Natterers.webp")
    },

    {
        id: "brandt",
        species: "Brandts",
        abr: "Bran (M)",
        group: "Myotis",
        frequencyRange: "33-89 kHz",
        info: "Typically peaks around ~45 kHz. Quiet, broadband calls with a relatively rapid rhythm. Agile flight, often around woodland and mature trees. Very difficult to distinguish acoustically from Whiskered and Alcathoe bats.",
        image: require("@assets/images/bats/brandt.jpg")
    },

    {
        id: "whiskered",
        species: "Whiskered",
        abr: "Whisk (M)",
        group: "Myotis",
        frequencyRange: "32-89 kHz",
        info: "Typically peaks around ~45 kHz. Quiet, broadband calls with dry, rapid clicks. Agile flight around woodland, hedgerows and open areas. Acoustic separation from Brandt's and Alcathoe is difficult.",
        image: require("@assets/images/bats/whiskered.jpg")
    },

    {
        id: "bechstein",
        species: "Bechsteins",
        abr: "Bech (M)",
        group: "Myotis",
        frequencyRange: "35-80 kHz",
        info: "Typically peaks around ~50 kHz. Very quiet calls, making it difficult to detect. Slow-medium, manoeuvrable flight close to woodland vegetation. Strongly associated with mature woodland.",
        image: require("@assets/images/bats/bechstein.jpg")
    },

    {
        id: "alcathoe",
        species: "Alcathoe",
        abr: "Alc (M)",
        group: "Myotis",
        frequencyRange: "43-120 kHz",
        info: "Very quiet, high-frequency Myotis calls, often peaking around ~45 kHz. Small, agile bat strongly associated with mature woodland and wet woodland. Extremely difficult to distinguish acoustically from Brandt's and Whiskered.",
        image: require("@assets/images/bats/alacthoe.jpg")
    },

    // Long-eared
    {
        id: "brown-long-eared",
        species: "Brown Long-eared",
        abr: "BLE",
        group: "Long-eared",
        frequencyRange: "25-50 kHz",
        info: "Very quiet calls, typically around ~35 kHz. Slow, fluttering flight close to vegetation; frequently gleans insects from leaves. Strongly associated with woodland, mature gardens and buildings. Large ears are distinctive if seen, but echolocation is easily missed.",
        image: require("@assets/images/bats/brown long eared.jpeg")
    },

    {
        id: "grey-long-eared",
        species: "Grey Long-eared",
        abr: "GLE",
        group: "Long-eared",
        frequencyRange: "30-63 kHz",
        info: "Very quiet calls, broadly overlapping Brown Long-eared. Often flies slowly close to vegetation and forages in open habitats and woodland edges. Very difficult to separate acoustically from Brown Long-eared; geographic location and visual identification are important.",
        image: require("@assets/images/bats/grey long eared.jpg")
    },

    // Nyctalus
    {
        id: "noctule",
        species: "Noctule",
        abr: "Noc",
        group: "Nyctalus",
        frequencyRange: "20-45 kHz",
        info: "Peak typically ~25 kHz. Loud, distinctive 'chip-chop' calls with a regular rhythm. Very fast, powerful flight, usually high above ground level. Often seen in open areas, woodland edges and over parks shortly after sunset.",
        image: require("@assets/images/bats/noctule.jpg")
    },

    {
        id: "leislers",
        species: "Leisler",
        abr: "Leis",
        group: "Nyctalus",
        frequencyRange: "15-45 kHz",
        info: "Peak typically ~25 kHz. Loud 'chip-chop' calls, similar to Noctule but often slightly higher-pitched and less powerful. Fast, high flight over woodland edges, fields and open areas. Can be difficult to separate from Noctule acoustically.",
        image: require("@assets/images/bats/leislers.jpg")
    },
    // Horseshoe
    {
        id: "greater-horseshoe",
        species: "Greater Horseshoe",
        abr: "GHS",
        group: "Horseshoe",
        frequencyRange: "78-84 kHz",
        info: "Constant-frequency call around ~82 kHz, producing a continuous tone rather than typical FM clicks. Large bat with broad wings. Flight is relatively slow and manoeuvrable. Associated with woodland, pasture, hedgerows and underground roosts.",
        image: require("@assets/images/bats/greater horseshoe.webp")
    },

    {
        id: "lesser-horseshoe",
        species: "Lesser Horseshoe",
        abr: "LHS",
        group: "Horseshoe",
        frequencyRange: "105-115 kHz",
        info: "Constant-frequency call around ~110 kHz, producing a continuous tone. Very small bat with rapid, agile flight, often close to vegetation. Usually associated with woodland, valleys and sheltered countryside. The very high call frequency is highly distinctive.",
        image: require("@assets/images/bats/lesser horseshoe.jpg")
    },
    // Other
    {
        id: "serotine",
        species: "Serotine",
        abr: "Ser",
        group: "Other",
        frequencyRange: "15-65 kHz",
        info: "Peak typically ~25-30 kHz. Loud, irregular 'tock' or 'clap'-like calls. Large bat with broad wings and relatively slow, deliberate flight. Often flies around buildings, woodland edges, parks and open countryside.",
        image: require("@assets/images/bats/serotine.jpg")
    },
    {
        id: "barbastelle",
        species: "Barbastelle",
        abr: "Barb",
        group: "Other",
        frequencyRange: "25-40 kHz",
        info: "Typically around ~32 kHz. Very distinctive, quiet 'smacking' calls, often occurring in pairs. Fast, agile flight, frequently close to woodland edges and vegetation. Strongly associated with mature woodland.",
        image: require("@assets/images/bats/barbastelle.jpg")
    },


];


