/**
 * Tipos A2UI v0.9 — derivados do catálogo oficial:
 * https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json
 *
 * Só inclui os componentes e props usados nesta POC.
 * Nunca invente props: confirme sempre no catalog.json antes de adicionar.
 */

export const CATALOG_ID =
    'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json';

export type A2UIVersion = 'v0.9';

// String literal ou referência ao data model via JSON Pointer
export type DynamicString = string | { path: string };

// Lista de filhos: IDs fixos ou template data-bound
export type ChildList = string[] | { componentId: string; path: string };

// Nomes de ícones válidos no catálogo basic v0.9
export type IconName =
    | 'accountCircle'
    | 'add'
    | 'arrowBack'
    | 'arrowForward'
    | 'attachFile'
    | 'calendarToday'
    | 'call'
    | 'camera'
    | 'check'
    | 'close'
    | 'delete'
    | 'download'
    | 'edit'
    | 'event'
    | 'error'
    | 'fastForward'
    | 'favorite'
    | 'favoriteOff'
    | 'folder'
    | 'help'
    | 'home'
    | 'info'
    | 'locationOn'
    | 'lock'
    | 'lockOpen'
    | 'mail'
    | 'menu'
    | 'moreVert'
    | 'moreHoriz'
    | 'notificationsOff'
    | 'notifications'
    | 'pause'
    | 'payment'
    | 'person'
    | 'phone'
    | 'photo'
    | 'play'
    | 'print'
    | 'refresh'
    | 'rewind'
    | 'search'
    | 'send'
    | 'settings'
    | 'share'
    | 'shoppingCart'
    | 'skipNext'
    | 'skipPrevious'
    | 'star'
    | 'starHalf'
    | 'starOff'
    | 'stop'
    | 'upload'
    | 'visibility'
    | 'visibilityOff'
    | 'volumeDown'
    | 'volumeMute'
    | 'volumeOff'
    | 'volumeUp'
    | 'warning';

// Variantes válidas para Text — "title" NÃO existe no catálogo
export type TextVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'caption' | 'body';

// ---- Componentes do catálogo basic ----

export type TextComponent = {
    id: string;
    component: 'Text';
    text: DynamicString;
    variant?: TextVariant;
    weight?: number;
};

export type IconComponent = {
    id: string;
    component: 'Icon';
    name: IconName | { path: string };
    weight?: number;
};

export type RowComponent = {
    id: string;
    component: 'Row';
    children: ChildList;
    align?: 'start' | 'center' | 'end' | 'stretch';
    justify?: 'center' | 'end' | 'spaceAround' | 'spaceBetween' | 'spaceEvenly' | 'start' | 'stretch';
    weight?: number;
};

export type ColumnComponent = {
    id: string;
    component: 'Column';
    children: ChildList;
    align?: 'center' | 'end' | 'start' | 'stretch';
    justify?: 'start' | 'center' | 'end' | 'spaceBetween' | 'spaceAround' | 'spaceEvenly' | 'stretch';
    weight?: number;
};

export type ListComponent = {
    id: string;
    component: 'List';
    children: ChildList;
    direction?: 'vertical' | 'horizontal';
    align?: 'start' | 'center' | 'end' | 'stretch';
};

export type CardComponent = {
    id: string;
    component: 'Card';
    child: string;
    weight?: number;
};

export type DividerComponent = {
    id: string;
    component: 'Divider';
    axis?: 'horizontal' | 'vertical';
};

export type AnyComponent =
    | TextComponent
    | IconComponent
    | RowComponent
    | ColumnComponent
    | ListComponent
    | CardComponent
    | DividerComponent;

// ---- Mensagens A2UI v0.9 ----

export type CreateSurfaceMsg = {
    version: A2UIVersion;
    createSurface: {
        surfaceId: string;
        catalogId: string;
        sendDataModel: boolean;
    };
};

export type UpdateComponentsMsg = {
    version: A2UIVersion;
    updateComponents: {
        surfaceId: string;
        components: AnyComponent[];
    };
};

export type UpdateDataModelMsg = {
    version: A2UIVersion;
    updateDataModel: {
        surfaceId: string;
        value: Record<string, unknown>;
    };
};

export type A2UIMessage = CreateSurfaceMsg | UpdateComponentsMsg | UpdateDataModelMsg;

// ---- Tipos de dado para cada template (input do LLM) ----

export type MatchScoreData = {
    score: string;
    resumo: string;
};

export type RequisitosData = {
    itens: Array<{
        requisito: string;
        situacao: 'coberto' | 'lacuna';
        nota?: string;
    }>;
};

export type PontosfortesData = {
    itens: Array<{
        titulo: string;
        descricao: string;
    }>;
};

export type SugestoesData = {
    itens: Array<{
        sugestao: string;
    }>;
};
