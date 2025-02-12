from datetime import datetime

from slack_sdk.models.blocks import ActionsBlock
from slack_sdk.models.blocks import Block
from slack_sdk.models.blocks import ButtonElement
from slack_sdk.models.blocks import ConfirmObject
from slack_sdk.models.blocks import DividerBlock
from slack_sdk.models.blocks import HeaderBlock
from slack_sdk.models.blocks import SectionBlock

from danswer.configs.constants import DocumentSource
from danswer.configs.constants import SearchFeedbackType
from danswer.configs.danswerbot_configs import DANSWER_BOT_NUM_DOCS_TO_DISPLAY
from danswer.configs.danswerbot_configs import ENABLE_SLACK_DOC_FEEDBACK
from danswer.danswerbot.slack.constants import DISLIKE_BLOCK_ACTION_ID
from danswer.danswerbot.slack.constants import LIKE_BLOCK_ACTION_ID
from danswer.danswerbot.slack.utils import build_feedback_block_id
from danswer.danswerbot.slack.utils import remove_slack_text_interactions
from danswer.danswerbot.slack.utils import translate_vespa_highlight_to_slack
from danswer.direct_qa.interfaces import DanswerQuote
from danswer.server.chat.models import SearchDoc
from danswer.utils.text_processing import replace_whitespaces_w_space


_MAX_BLURB_LEN = 75


def build_qa_feedback_block(query_event_id: int) -> Block:
    return ActionsBlock(
        block_id=build_feedback_block_id(query_event_id),
        elements=[
            ButtonElement(
                action_id=LIKE_BLOCK_ACTION_ID,
                text="👍",
                style="primary",
            ),
            ButtonElement(
                action_id=DISLIKE_BLOCK_ACTION_ID,
                text="👎",
                style="danger",
            ),
        ],
    )


def build_doc_feedback_block(
    query_event_id: int,
    document_id: str,
    document_rank: int,
) -> Block:
    return ActionsBlock(
        block_id=build_feedback_block_id(query_event_id, document_id, document_rank),
        elements=[
            ButtonElement(
                action_id=SearchFeedbackType.ENDORSE.value,
                text="⬆",
                style="primary",
                confirm=ConfirmObject(
                    title="Endorse this Document",
                    text="This is a good source of information and should be shown more often!",
                ),
            ),
            ButtonElement(
                action_id=SearchFeedbackType.REJECT.value,
                text="⬇",
                style="danger",
                confirm=ConfirmObject(
                    title="Reject this Document",
                    text="This is a bad source of information and should be shown less often.",
                ),
            ),
        ],
    )


def get_restate_blocks(
    msg: str,
    is_bot_msg: bool,
) -> list[Block]:
    # Only the slash command needs this context because the user doesnt see their own input
    if not is_bot_msg:
        return []

    return [
        HeaderBlock(text="Responding to the Query"),
        SectionBlock(text=f"```{msg}```"),
    ]


def build_documents_blocks(
    documents: list[SearchDoc],
    query_event_id: int,
    num_docs_to_display: int = DANSWER_BOT_NUM_DOCS_TO_DISPLAY,
    include_feedback: bool = ENABLE_SLACK_DOC_FEEDBACK,
) -> list[Block]:
    seen_docs_identifiers = set()
    section_blocks: list[Block] = [HeaderBlock(text="Reference Documents")]
    included_docs = 0
    for rank, d in enumerate(documents):
        if d.document_id in seen_docs_identifiers:
            continue
        seen_docs_identifiers.add(d.document_id)

        doc_sem_id = d.semantic_identifier
        if d.source_type == DocumentSource.SLACK.value:
            doc_sem_id = "#" + doc_sem_id

        used_chars = len(doc_sem_id) + 3
        match_str = translate_vespa_highlight_to_slack(d.match_highlights, used_chars)

        included_docs += 1

        if d.link:
            block_text = f"<{d.link}|{doc_sem_id}>:\n>{remove_slack_text_interactions(match_str)}"
        else:
            block_text = f"{doc_sem_id}:\n>{remove_slack_text_interactions(match_str)}"

        section_blocks.append(
            SectionBlock(text=block_text),
        )

        if include_feedback:
            section_blocks.append(
                build_doc_feedback_block(
                    query_event_id=query_event_id,
                    document_id=d.document_id,
                    document_rank=rank,
                ),
            )

        section_blocks.append(DividerBlock())

        if included_docs >= num_docs_to_display:
            break

    return section_blocks


def build_quotes_block(
    quotes: list[DanswerQuote],
) -> list[Block]:
    quote_lines: list[str] = []
    doc_to_quotes: dict[str, list[str]] = {}
    doc_to_link: dict[str, str] = {}
    doc_to_sem_id: dict[str, str] = {}
    for q in quotes:
        quote = q.quote
        doc_id = q.document_id
        doc_link = q.link
        doc_name = q.semantic_identifier
        if doc_link and doc_name and doc_id and quote:
            if doc_id not in doc_to_quotes:
                doc_to_quotes[doc_id] = [quote]
                doc_to_link[doc_id] = doc_link
                doc_to_sem_id[doc_id] = (
                    doc_name
                    if q.source_type != DocumentSource.SLACK.value
                    else "#" + doc_name
                )
            else:
                doc_to_quotes[doc_id].append(quote)

    for doc_id, quote_strs in doc_to_quotes.items():
        quotes_str_clean = [
            replace_whitespaces_w_space(q_str).strip() for q_str in quote_strs
        ]
        longest_quotes = sorted(quotes_str_clean, key=len, reverse=True)[:5]
        single_quote_str = "\n".join([f"```{q_str}```" for q_str in longest_quotes])
        link = doc_to_link[doc_id]
        sem_id = doc_to_sem_id[doc_id]
        quote_lines.append(
            f"<{link}|{sem_id}>:\n{remove_slack_text_interactions(single_quote_str)}"
        )

    if not doc_to_quotes:
        return []

    return [SectionBlock(text="*Relevant Snippets*\n" + "\n".join(quote_lines))]


def build_qa_response_blocks(
    query_event_id: int,
    answer: str | None,
    quotes: list[DanswerQuote] | None,
    source_filters: list[DocumentSource] | None,
    time_cutoff: datetime | None,
    favor_recent: bool,
) -> list[Block]:
    quotes_blocks: list[Block] = []

    ai_answer_header = HeaderBlock(text="AI Answer")

    filter_block: Block | None = None
    if time_cutoff or favor_recent or source_filters:
        filter_text = "Filters: "
        if source_filters:
            sources_str = ", ".join([s.value for s in source_filters])
            filter_text += f"`Sources in [{sources_str}]`"
            if time_cutoff or favor_recent:
                filter_text += " and "
        if time_cutoff is not None:
            time_str = time_cutoff.strftime("%b %d, %Y")
            filter_text += f"`Docs Updated >= {time_str}` "
        if favor_recent:
            if time_cutoff is not None:
                filter_text += "+ "
            filter_text += "`Prioritize Recently Updated Docs`"

        filter_block = SectionBlock(text=f"_{filter_text}_")

    if not answer:
        answer_block = SectionBlock(
            text="Sorry, I was unable to find an answer, but I did find some potentially relevant docs 🤓"
        )
    else:
        answer_block = SectionBlock(text=remove_slack_text_interactions(answer))
        if quotes:
            quotes_blocks = build_quotes_block(quotes)

        # if no quotes OR `build_quotes_block()` did not give back any blocks
        if not quotes_blocks:
            quotes_blocks = [
                SectionBlock(
                    text="*Warning*: no sources were quoted for this answer, so it may be unreliable 😔"
                )
            ]

    feedback_block = build_qa_feedback_block(query_event_id=query_event_id)

    response_blocks: list[Block] = [ai_answer_header]

    if filter_block is not None:
        response_blocks.append(filter_block)

    response_blocks.extend(
        [answer_block, feedback_block] + quotes_blocks + [DividerBlock()]
    )

    return response_blocks
