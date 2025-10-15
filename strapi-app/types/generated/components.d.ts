import type { Schema, Struct } from '@strapi/strapi';

export interface BaseGroupOption extends Struct.ComponentSchema {
  collectionName: 'components_base_group_options';
  info: {
    displayName: 'group_option';
    icon: 'braille';
    name: 'group_option';
  };
  attributes: {
    title: Schema.Attribute.String;
  };
}

export interface BaseOption extends Struct.ComponentSchema {
  collectionName: 'components_questions_options';
  info: {
    description: '';
    displayName: 'option';
    icon: 'align-justify';
    name: 'option';
  };
  attributes: {
    photo: Schema.Attribute.Media<'images'>;
    solution: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    title: Schema.Attribute.String;
  };
}

export interface BaseRelationConcept extends Struct.ComponentSchema {
  collectionName: 'components_base_relation_concepts';
  info: {
    displayName: 'relation_concept';
    icon: 'bacon';
    name: 'relation_concept';
  };
  attributes: {
    concept_A: Schema.Attribute.String;
    concept_B: Schema.Attribute.String;
    photo_A: Schema.Attribute.Media<'images'>;
    photo_B: Schema.Attribute.Media<'images'>;
  };
}

export interface BaseWebLabel extends Struct.ComponentSchema {
  collectionName: 'components_base_web_labels';
  info: {
    description: '';
    displayName: 'WebLabel';
    icon: 'chartBubble';
  };
  attributes: {
    emoji: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface FaqFaqSection extends Struct.ComponentSchema {
  collectionName: 'components_faq_faq_sections';
  info: {
    description: '';
    displayName: 'faq_section';
    icon: 'comment-medical';
    name: 'faq_section';
  };
  attributes: {
    attachment: Schema.Attribute.Media<'images' | 'files' | 'videos'>;
    attachment_title: Schema.Attribute.String;
    body: Schema.Attribute.Text;
    icon: Schema.Attribute.Media<'images'>;
    iconName: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface InfoInfo extends Struct.ComponentSchema {
  collectionName: 'components_info_infos';
  info: {
    description: '';
    displayName: 'Info';
    icon: 'asterisk';
    name: 'Info';
  };
  attributes: {
    Environment: Schema.Attribute.Enumeration<['Dev', 'Prod']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'Dev'>;
  };
}

export interface LicenseDataAdvantages extends Struct.ComponentSchema {
  collectionName: 'components_license_data_advantages';
  info: {
    description: '';
    displayName: 'advantages';
  };
  attributes: {
    included: Schema.Attribute.Boolean & Schema.Attribute.Required;
    title: Schema.Attribute.Relation<
      'oneToOne',
      'api::license-advantage.license-advantage'
    >;
  };
}

export interface LicenseDataRequirements extends Struct.ComponentSchema {
  collectionName: 'components_license_data_requirements';
  info: {
    description: '';
    displayName: 'Requirements';
  };
  attributes: {
    description: Schema.Attribute.String;
    license_stage: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface MarketplaceProductFaq extends Struct.ComponentSchema {
  collectionName: 'components_marketplace_product_faqs';
  info: {
    description: '';
    displayName: 'FAQ';
  };
  attributes: {
    answer: Schema.Attribute.Text;
    question: Schema.Attribute.String;
  };
}

export interface MarketplaceProductFeatures extends Struct.ComponentSchema {
  collectionName: 'components_marketplace_product_features';
  info: {
    description: '';
    displayName: 'Features';
  };
  attributes: {
    icon: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String;
  };
}

export interface NotificationInAppChat extends Struct.ComponentSchema {
  collectionName: 'components_notification_in_app_chats';
  info: {
    displayName: 'inAppChat';
  };
  attributes: {
    body: Schema.Attribute.RichText;
  };
}

export interface NotificationMail extends Struct.ComponentSchema {
  collectionName: 'components_notification_mail';
  info: {
    displayName: 'mail';
  };
  attributes: {
    templateId: Schema.Attribute.String;
  };
}

export interface NotificationPush extends Struct.ComponentSchema {
  collectionName: 'components_notification_pushes';
  info: {
    displayName: 'push';
  };
  attributes: {
    body: Schema.Attribute.Text;
    title: Schema.Attribute.String;
  };
}

export interface OfferSubsections extends Struct.ComponentSchema {
  collectionName: 'components_offer_subsections';
  info: {
    displayName: 'subsections';
    icon: 'align-justify';
  };
  attributes: {
    body: Schema.Attribute.Text;
    icon: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String;
  };
}

export interface QuestionsConceptRelations extends Struct.ComponentSchema {
  collectionName: 'components_questions_concept_relations';
  info: {
    description: '';
    displayName: 'Relaci\u00F3n de conceptos';
    icon: 'link';
    name: 'Relaci\u00F3n de conceptos';
  };
  attributes: {
    concepts: Schema.Attribute.Component<'base.relation-concept', true>;
  };
}

export interface QuestionsGroups extends Struct.ComponentSchema {
  collectionName: 'components_questions_groups';
  info: {
    description: '';
    displayName: 'Agrupar';
    icon: 'th-list';
    name: 'Agrupar';
  };
  attributes: {
    group_A: Schema.Attribute.String;
    group_B: Schema.Attribute.String;
    options_group_A: Schema.Attribute.Component<'base.group-option', true>;
    options_group_B: Schema.Attribute.Component<'base.group-option', true>;
  };
}

export interface QuestionsMultipleOptions extends Struct.ComponentSchema {
  collectionName: 'components_questions_multiple_options';
  info: {
    description: '';
    displayName: 'Opciones m\u00FAltiples';
    icon: 'align-center';
    name: 'Opciones m\u00FAltiples';
  };
  attributes: {
    exam: Schema.Attribute.Boolean;
    options: Schema.Attribute.Component<'base.option', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
  };
}

export interface QuestionsTrueFalseOptions extends Struct.ComponentSchema {
  collectionName: 'components_questions_true_false_options';
  info: {
    description: '';
    displayName: 'Verdadero/Falso';
    icon: 'check';
    name: 'Verdadero/Falso';
  };
  attributes: {
    istrue: Schema.Attribute.Boolean & Schema.Attribute.Required;
  };
}

export interface SeoMeta extends Struct.ComponentSchema {
  collectionName: 'components_seo_metas';
  info: {
    description: '';
    displayName: 'meta';
    icon: 'code';
  };
  attributes: {
    content: Schema.Attribute.Text;
    name: Schema.Attribute.String;
    nextjs_path: Schema.Attribute.String;
  };
}

export interface SeoSeo extends Struct.ComponentSchema {
  collectionName: 'components_seo_seos';
  info: {
    description: '';
    displayName: 'seo';
    icon: 'chartBubble';
  };
  attributes: {
    meta: Schema.Attribute.Component<'seo.meta', true>;
  };
}

export interface SummarySummaryTab extends Struct.ComponentSchema {
  collectionName: 'components_summary_summary_tabs';
  info: {
    description: '';
    displayName: 'Summary Tab';
    icon: 'strikeThrough';
  };
  attributes: {
    cta: Schema.Attribute.String;
    labels: Schema.Attribute.Component<'base.web-label', true>;
    photo: Schema.Attribute.Media<'images'>;
    slideBody: Schema.Attribute.Text;
    slideTitle: Schema.Attribute.String;
    title: Schema.Attribute.String;
  };
}

export interface TeacherTraits extends Struct.ComponentSchema {
  collectionName: 'components_teacher_traits';
  info: {
    displayName: 'traits';
  };
  attributes: {
    description: Schema.Attribute.String;
  };
}

export interface UtilsTitleDescription extends Struct.ComponentSchema {
  collectionName: 'components_utils_title_descriptions';
  info: {
    description: '';
    displayName: 'Title_description';
  };
  attributes: {
    description: Schema.Attribute.Text;
    icon: Schema.Attribute.Media<'images'>;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'base.group-option': BaseGroupOption;
      'base.option': BaseOption;
      'base.relation-concept': BaseRelationConcept;
      'base.web-label': BaseWebLabel;
      'faq.faq-section': FaqFaqSection;
      'info.info': InfoInfo;
      'license-data.advantages': LicenseDataAdvantages;
      'license-data.requirements': LicenseDataRequirements;
      'marketplace-product.faq': MarketplaceProductFaq;
      'marketplace-product.features': MarketplaceProductFeatures;
      'notification.in-app-chat': NotificationInAppChat;
      'notification.mail': NotificationMail;
      'notification.push': NotificationPush;
      'offer.subsections': OfferSubsections;
      'questions.concept-relations': QuestionsConceptRelations;
      'questions.groups': QuestionsGroups;
      'questions.multiple-options': QuestionsMultipleOptions;
      'questions.true-false-options': QuestionsTrueFalseOptions;
      'seo.meta': SeoMeta;
      'seo.seo': SeoSeo;
      'summary.summary-tab': SummarySummaryTab;
      'teacher.traits': TeacherTraits;
      'utils.title-description': UtilsTitleDescription;
    }
  }
}
